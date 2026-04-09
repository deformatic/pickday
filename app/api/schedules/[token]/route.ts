import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { tokenParamSchema } from "@/lib/validation/routes";
import type { PublicSchedule } from "@/types/schedule";

type ScheduleRow = {
  id: number;
  token: string;
  title: string;
  location: string;
  time_info: string;
  is_protected: boolean;
  require_email: boolean;
  require_phone: boolean;
  schedule_options: Array<{
    id: number;
    datetime: string;
    label: string;
  }> | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const parsedParams = tokenParamSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid schedule token" }, { status: 400 });
    }

    const { token } = parsedParams.data;
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("schedules")
      .select(
        "id, token, title, location, time_info, is_protected, require_email, require_phone, schedule_options(id, datetime, label)",
      )
      .eq("token", token)
      .single<ScheduleRow>();

    if (error || !data) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const schedule: PublicSchedule = {
      id: data.id,
      token: data.token,
      title: data.title,
      location: data.location,
      timeInfo: data.time_info,
      isProtected: data.is_protected,
      requireEmail: data.require_email,
      requirePhone: data.require_phone,
      options: [...(data.schedule_options ?? [])].sort((left, right) =>
        left.datetime.localeCompare(right.datetime),
      ),
    };

    return NextResponse.json(schedule);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
