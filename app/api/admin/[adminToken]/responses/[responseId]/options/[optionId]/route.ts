import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { responseOptionRouteParamSchema } from "@/lib/validation/routes";

const adminDeleteSchema = z.object({
  adminPassword: z.string().trim().min(1, "Admin password is required").max(100),
});

type AdminScheduleRow = {
  id: number;
  admin_password_hash: string;
};

type ResponseOwnerRow = {
  id: number;
  schedule_id: number;
  assigned_option_id: number | null;
};

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ adminToken: string; responseId: string; optionId: string }> },
) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsedBody = adminDeleteSchema.safeParse(payload);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid delete payload" }, { status: 400 });
  }

  try {
    const parsedParams = responseOptionRouteParamSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid response option route parameters" }, { status: 400 });
    }

    const { adminToken, responseId, optionId } = parsedParams.data;
    const supabase = createSupabaseAdminClient();
    const { data: schedule, error: scheduleError } = await supabase
      .from("schedules")
      .select("id, admin_password_hash")
      .eq("admin_token", adminToken)
      .single<AdminScheduleRow>();

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: "Admin schedule not found" }, { status: 404 });
    }

    const verified = await compare(parsedBody.data.adminPassword, schedule.admin_password_hash);

    if (!verified) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const { data: response, error: responseError } = await supabase
      .from("responses")
      .select("id, schedule_id, assigned_option_id")
      .eq("id", responseId)
      .single<ResponseOwnerRow>();

    if (responseError || !response || response.schedule_id !== schedule.id) {
      return NextResponse.json({ error: "Response not found for this schedule" }, { status: 404 });
    }

    const { data: option, error: optionError } = await supabase
      .from("schedule_options")
      .select("id")
      .eq("id", optionId)
      .eq("schedule_id", schedule.id)
      .single<{ id: number }>();

    if (optionError || !option) {
      return NextResponse.json({ error: "Selected option not found for this schedule" }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("response_selected_options")
      .delete()
      .eq("response_id", responseId)
      .eq("option_id", optionId);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to remove selected option" }, { status: 500 });
    }

    if (response.assigned_option_id === optionId) {
      const { error: clearAssignmentError } = await supabase
        .from("responses")
        .update({ assigned_option_id: null })
        .eq("id", responseId);

      if (clearAssignmentError) {
        return NextResponse.json({ error: "Failed to clear assignment for removed option" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
