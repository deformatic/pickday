import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { writeResponseAuditLog } from "@/lib/api/response-audit-log";
import { getAdminSessionCookieName, verifyAdminSessionToken } from "@/lib/server/auth-session";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { responseOptionRouteParamSchema } from "@/lib/validation/routes";

type AdminScheduleRow = {
  id: number;
};

type ResponseOwnerRow = {
  id: number;
  schedule_id: number;
};

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ adminToken: string; responseId: string; optionId: string }> },
) {
  try {
    const parsedParams = responseOptionRouteParamSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid response option route parameters" }, { status: 400 });
    }

    const { adminToken, responseId, optionId } = parsedParams.data;
    const sessionToken = (await cookies()).get(getAdminSessionCookieName(adminToken))?.value;

    if (!sessionToken || !verifyAdminSessionToken(sessionToken, adminToken)) {
      return NextResponse.json({ error: "Admin session is required" }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const rateLimit = await enforceRateLimit({
      request,
      supabase,
      maxRequests: 20,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many admin actions from this client. Try again later." }, { status: 429 });
    }

    const { data: schedule, error: scheduleError } = await supabase
      .from("schedules")
      .select("id")
      .eq("admin_token", adminToken)
      .single<AdminScheduleRow>();

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: "Admin schedule not found" }, { status: 404 });
    }

    const { data: response, error: responseError } = await supabase
      .from("responses")
      .select("id, schedule_id")
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

    const { error: clearAssignmentError } = await supabase
      .from("response_assigned_options")
      .delete()
      .eq("response_id", responseId)
      .eq("option_id", optionId);

    if (clearAssignmentError) {
      return NextResponse.json({ error: "Failed to clear assignment for removed option" }, { status: 500 });
    }

    await writeResponseAuditLog({
      supabase,
      responseId,
      action: "admin_selected_option_delete",
      actorType: "admin_token",
      actorIdentifier: adminToken,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
