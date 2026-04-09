import { hash } from "bcryptjs";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { enforceRateLimit } from "@/lib/api/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createScheduleSchema } from "@/lib/validation/schedules";

const TOKEN_SIZE = 21;
const BCRYPT_ROUNDS = 10;

type CreatedSchedule = {
  id: number;
  token: string;
  admin_token: string;
};

function buildValidationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid schedule payload",
      issues: error.flatten(),
    },
    { status: 400 },
  );
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = createScheduleSchema.safeParse(payload);

  if (!parsed.success) {
    return buildValidationErrorResponse(parsed.error);
  }

  try {
    const supabase = createSupabaseAdminClient();
    const rateLimit = await enforceRateLimit({
      request,
      supabase,
      maxRequests: 10,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests from this IP. Try again later." }, { status: 429 });
    }

    const scheduleToken = nanoid(TOKEN_SIZE);
    const adminToken = nanoid(TOKEN_SIZE);
    const adminPasswordHash = await hash(parsed.data.adminPassword, BCRYPT_ROUNDS);
    const accessPasswordHash = parsed.data.accessPassword
      ? await hash(parsed.data.accessPassword, BCRYPT_ROUNDS)
      : null;

    const { data: createdSchedule, error: scheduleError } = await supabase
      .from("schedules")
      .insert({
        token: scheduleToken,
        admin_token: adminToken,
        title: parsed.data.title,
        location: parsed.data.location,
        time_info: parsed.data.timeInfo,
        is_protected: accessPasswordHash !== null,
        access_password_hash: accessPasswordHash,
        admin_password_hash: adminPasswordHash,
        require_email: parsed.data.requireEmail,
        require_phone: parsed.data.requirePhone,
      })
      .select("id, token, admin_token")
      .single<CreatedSchedule>();

    if (scheduleError || !createdSchedule) {
      return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
    }

    const optionRows = parsed.data.options.map((option) => ({
      schedule_id: createdSchedule.id,
      datetime: option.datetime,
      label: option.label,
    }));

    const { error: optionError } = await supabase.from("schedule_options").insert(optionRows);

    if (optionError) {
      await supabase.from("schedules").delete().eq("id", createdSchedule.id);

      return NextResponse.json({ error: "Failed to create schedule options" }, { status: 500 });
    }

    const origin = new URL(request.url).origin;

    return NextResponse.json(
      {
        scheduleToken: createdSchedule.token,
        adminToken: createdSchedule.admin_token,
        participantUrl: `${origin}/s/${createdSchedule.token}`,
        adminUrl: `${origin}/admin/${createdSchedule.admin_token}`,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
