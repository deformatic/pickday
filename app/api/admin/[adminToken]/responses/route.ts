import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getAdminSessionCookieName, verifyAdminSessionToken } from "@/lib/server/auth-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminTokenParamSchema } from "@/lib/validation/routes";
import type { AdminAggregate, AdminDashboardData, AdminResponseItem, AdminScheduleOption } from "@/types/admin";

type AdminScheduleWithResponses = {
  id: number;
  title: string;
  location: string;
  time_info: string;
  schedule_options: Array<{
    id: number;
    start_at: string;
    end_at: string;
    note: string | null;
  }> | null;
  responses: Array<{
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    comment: string | null;
    assigned_option_id: number | null;
    created_at: string;
    response_selected_options: Array<{ option_id: number }> | null;
  }> | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ adminToken: string }> },
) {
  try {
    const parsedParams = adminTokenParamSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid admin token" }, { status: 400 });
    }

    const { adminToken } = parsedParams.data;
    const sessionToken = (await cookies()).get(getAdminSessionCookieName(adminToken))?.value;

    if (!sessionToken || !verifyAdminSessionToken(sessionToken, adminToken)) {
      return NextResponse.json({ error: "Admin session is required" }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("schedules")
      .select(
        "id, title, location, time_info, schedule_options(id, start_at, end_at, note), responses(id, name, email, phone, comment, assigned_option_id, created_at, response_selected_options(option_id))",
      )
      .eq("admin_token", adminToken)
      .single<AdminScheduleWithResponses>();

    if (error || !data) {
      return NextResponse.json({ error: "Admin schedule not found" }, { status: 404 });
    }

    const options: AdminScheduleOption[] = [...(data.schedule_options ?? [])]
      .map((option) => ({
        id: option.id,
        startAt: option.start_at,
        endAt: option.end_at,
        note: option.note,
      }))
      .sort((left, right) => left.startAt.localeCompare(right.startAt));
    const optionMap = new Map(options.map((option) => [option.id, option]));

    const responses: AdminResponseItem[] = (data.responses ?? []).map((response) => ({
      id: response.id,
      name: response.name,
      email: response.email,
      phone: response.phone,
      comment: response.comment,
      assignedOptionId: response.assigned_option_id,
      createdAt: response.created_at,
      selectedOptions: (response.response_selected_options ?? [])
        .map((item) => optionMap.get(item.option_id))
        .filter((option): option is AdminScheduleOption => option !== undefined),
    }));

    const aggregates: AdminAggregate[] = options
      .map((option) => ({
        optionId: option.id,
        startAt: option.startAt,
        endAt: option.endAt,
        note: option.note,
        responseCount: responses.filter((response) =>
          response.selectedOptions.some((selectedOption) => selectedOption.id === option.id),
        ).length,
      }))
      .sort((left, right) => right.responseCount - left.responseCount || left.startAt.localeCompare(right.startAt));

    const payload: AdminDashboardData = {
      schedule: {
        title: data.title,
        location: data.location,
        note: data.time_info,
      },
      options,
      responses,
      aggregates,
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
