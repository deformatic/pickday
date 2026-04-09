import { compare } from "bcryptjs";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminTokenParamSchema } from "@/lib/validation/routes";
import type { AdminAggregate, AdminDashboardData, AdminResponseItem, AdminScheduleOption } from "@/types/admin";

type AdminScheduleWithResponses = {
  id: number;
  title: string;
  location: string;
  time_info: string;
  admin_password_hash: string;
  schedule_options: Array<{
    id: number;
    label: string;
    datetime: string;
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

function getAdminPasswordFromRequest(request: Request) {
  return request.headers.get("x-admin-password")?.trim() ?? "";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ adminToken: string }> },
) {
  try {
    const adminPassword = getAdminPasswordFromRequest(request);

    if (!adminPassword) {
      return NextResponse.json({ error: "Admin password header is required" }, { status: 401 });
    }

    const parsedParams = adminTokenParamSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid admin token" }, { status: 400 });
    }

    const { adminToken } = parsedParams.data;
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("schedules")
      .select(
        "id, title, location, time_info, admin_password_hash, schedule_options(id, label, datetime), responses(id, name, email, phone, comment, assigned_option_id, created_at, response_selected_options(option_id))",
      )
      .eq("admin_token", adminToken)
      .single<AdminScheduleWithResponses>();

    if (error || !data) {
      return NextResponse.json({ error: "Admin schedule not found" }, { status: 404 });
    }

    const verified = await compare(adminPassword, data.admin_password_hash);

    if (!verified) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const options: AdminScheduleOption[] = [...(data.schedule_options ?? [])].sort((left, right) =>
      left.datetime.localeCompare(right.datetime),
    );
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
        label: option.label,
        datetime: option.datetime,
        responseCount: responses.filter((response) =>
          response.selectedOptions.some((selectedOption) => selectedOption.id === option.id),
        ).length,
      }))
      .sort((left, right) => right.responseCount - left.responseCount || left.datetime.localeCompare(right.datetime));

    const payload: AdminDashboardData = {
      schedule: {
        title: data.title,
        location: data.location,
        timeInfo: data.time_info,
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
