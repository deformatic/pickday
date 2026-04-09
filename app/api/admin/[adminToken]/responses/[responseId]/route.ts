import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { responseRouteParamSchema } from "@/lib/validation/routes";

const assignScheduleOptionSchema = z.object({
  adminPassword: z.string().trim().min(1, "Admin password is required").max(100),
  assignedOptionId: z.number().int().positive().nullable(),
});

type ResponseOwnerRow = {
  id: number;
  schedule_id: number;
};

type AdminScheduleRow = {
  id: number;
  admin_password_hash: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ adminToken: string; responseId: string }> },
) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = assignScheduleOptionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid assignment payload" }, { status: 400 });
  }

  try {
    const parsedParams = responseRouteParamSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid response route parameters" }, { status: 400 });
    }

    const { adminToken, responseId } = parsedParams.data;
    const supabase = createSupabaseAdminClient();
    const { data: schedule, error: scheduleError } = await supabase
      .from("schedules")
      .select("id, admin_password_hash")
      .eq("admin_token", adminToken)
      .single<AdminScheduleRow>();

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: "Admin schedule not found" }, { status: 404 });
    }

    const verified = await compare(parsed.data.adminPassword, schedule.admin_password_hash);

    if (!verified) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const { data: response, error: responseError } = await supabase
      .from("responses")
      .select("id, schedule_id")
      .eq("id", responseId)
      .single<ResponseOwnerRow>();

    if (responseError || !response || response.schedule_id !== schedule.id) {
      return NextResponse.json({ error: "Response not found for this schedule" }, { status: 404 });
    }

    if (parsed.data.assignedOptionId !== null) {
      const { data: option, error: optionError } = await supabase
        .from("schedule_options")
        .select("id")
        .eq("id", parsed.data.assignedOptionId)
        .eq("schedule_id", schedule.id)
        .single<{ id: number }>();

      if (optionError || !option) {
        return NextResponse.json({ error: "Assigned option does not belong to this schedule" }, { status: 400 });
      }

      const { error: clearExistingAssignmentError } = await supabase
        .from("responses")
        .update({ assigned_option_id: null })
        .eq("schedule_id", schedule.id)
        .eq("assigned_option_id", parsed.data.assignedOptionId)
        .neq("id", responseId);

      if (clearExistingAssignmentError) {
        return NextResponse.json({ error: "Failed to clear previous assignment" }, { status: 500 });
      }
    }

    const { error: updateError } = await supabase
      .from("responses")
      .update({ assigned_option_id: parsed.data.assignedOptionId })
      .eq("id", responseId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
