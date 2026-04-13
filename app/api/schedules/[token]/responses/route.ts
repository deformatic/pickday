import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { enforceRateLimit } from "@/lib/api/rate-limit";
import { getScheduleSessionCookieName, verifyScheduleSessionToken } from "@/lib/server/auth-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { tokenParamSchema } from "@/lib/validation/routes";
import { createScheduleResponseSchema } from "@/lib/validation/responses";

type ResponseScheduleRow = {
  id: number;
  token: string;
  is_protected: boolean;
  require_email: boolean;
  require_phone: boolean;
  schedule_options: Array<{ id: number }> | null;
};

type ExistingResponseRow = {
  id: number;
};

type InstructorIdentityRow = {
  id: number;
};

function normalizeOptionalValue(value: string | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function buildValidationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: "Invalid response payload",
      issues: error.flatten(),
    },
    { status: 400 },
  );
}

async function findExistingInstructorIdentity(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  name: string,
  email: string | null,
  phone: string | null,
) {
  let query = supabase.from("instructor_identities").select("id").eq("name", name).limit(1);

  query = email === null ? query.is("email", null) : query.eq("email", email);
  query = phone === null ? query.is("phone", null) : query.eq("phone", phone);

  const { data, error } = await query.single<InstructorIdentityRow>();

  if (error || !data) {
    return null;
  }

  return data.id;
}

async function upsertInstructorIdentity(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  name: string,
  email: string | null,
  phone: string | null,
) {
  if (email === null && phone === null) {
    return null;
  }

  const existingId = await findExistingInstructorIdentity(supabase, name, email, phone);

  if (existingId !== null) {
    return existingId;
  }

  const { data, error } = await supabase
    .from("instructor_identities")
    .insert({
      name,
      email,
      phone,
    })
    .select("id")
    .single<InstructorIdentityRow>();

  if (error || !data) {
    throw new Error("Failed to save instructor identity");
  }

  return data.id;
}

async function findExistingResponse(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  scheduleId: number,
  name: string,
  email: string | null,
  phone: string | null,
) {
  let query = supabase.from("responses").select("id").eq("schedule_id", scheduleId).eq("name", name).limit(1);

  query = email === null ? query.is("email", null) : query.eq("email", email);
  query = phone === null ? query.is("phone", null) : query.eq("phone", phone);

  const { data, error } = await query.single<ExistingResponseRow>();

  if (error || !data) {
    return null;
  }

  return data.id;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = createScheduleResponseSchema.safeParse(payload);

  if (!parsed.success) {
    return buildValidationErrorResponse(parsed.error);
  }

  try {
    const parsedParams = tokenParamSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid schedule token" }, { status: 400 });
    }

    const { token } = parsedParams.data;
    const supabase = createSupabaseAdminClient();

    const { data: schedule, error: scheduleError } = await supabase
      .from("schedules")
      .select("id, token, is_protected, require_email, require_phone, schedule_options(id)")
      .eq("token", token)
      .single<ResponseScheduleRow>();

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const email = normalizeOptionalValue(parsed.data.email);
    const phone = normalizeOptionalValue(parsed.data.phone);

    if (schedule.require_email && email === null) {
      return NextResponse.json({ error: "Email is required for this schedule" }, { status: 400 });
    }

    if (schedule.require_phone && phone === null) {
      return NextResponse.json({ error: "Phone number is required for this schedule" }, { status: 400 });
    }

    if (schedule.is_protected) {
      const sessionToken = (await cookies()).get(getScheduleSessionCookieName(token))?.value;

      if (!sessionToken || !verifyScheduleSessionToken(sessionToken, token)) {
        return NextResponse.json({ error: "Schedule session is required" }, { status: 401 });
      }
    }

    const validOptionIds = new Set((schedule.schedule_options ?? []).map((option) => option.id));
    const hasInvalidOption = parsed.data.selectedOptionIds.some((optionId) => !validOptionIds.has(optionId));

    if (hasInvalidOption) {
      return NextResponse.json({ error: "Selected options must belong to the schedule" }, { status: 400 });
    }

    const rateLimit = await enforceRateLimit({
      request,
      supabase,
      maxRequests: 10,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many responses from this IP. Try again later." }, { status: 429 });
    }

    const instructorIdentityId = await upsertInstructorIdentity(
      supabase,
      parsed.data.name,
      email,
      phone,
    );

    const existingResponseId = await findExistingResponse(
      supabase,
      schedule.id,
      parsed.data.name,
      email,
      phone,
    );

    let responseId = existingResponseId;

    if (responseId === null) {
      const { data, error } = await supabase
        .from("responses")
        .insert({
          schedule_id: schedule.id,
          instructor_identity_id: instructorIdentityId,
          name: parsed.data.name,
          email,
          phone,
          comment: normalizeOptionalValue(parsed.data.comment),
        })
        .select("id")
        .single<ExistingResponseRow>();

      if (error || !data) {
        return NextResponse.json({ error: "Failed to save response" }, { status: 500 });
      }

      responseId = data.id;
    } else {
      const { error } = await supabase
        .from("responses")
        .update({
          instructor_identity_id: instructorIdentityId,
          comment: normalizeOptionalValue(parsed.data.comment),
          updated_at: new Date().toISOString(),
        })
        .eq("id", responseId);

      if (error) {
        return NextResponse.json({ error: "Failed to update response" }, { status: 500 });
      }

      const { error: deleteError } = await supabase
        .from("response_selected_options")
        .delete()
        .eq("response_id", responseId);

      if (deleteError) {
        return NextResponse.json({ error: "Failed to refresh selected options" }, { status: 500 });
      }
    }

    const selectedOptions = parsed.data.selectedOptionIds.map((optionId) => ({
      response_id: responseId,
      option_id: optionId,
    }));

    const { error: selectedOptionsError } = await supabase
      .from("response_selected_options")
      .insert(selectedOptions);

    if (selectedOptionsError) {
      return NextResponse.json({ error: "Failed to save selected options" }, { status: 500 });
    }

    return NextResponse.json(
      {
        responseId,
        updated: existingResponseId !== null,
      },
      { status: existingResponseId === null ? 201 : 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
