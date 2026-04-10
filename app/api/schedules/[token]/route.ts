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
    start_at: string;
    end_at: string;
    note: string | null;
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
        "id, token, title, location, time_info, is_protected, require_email, require_phone, schedule_options(id, start_at, end_at, note)",
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
      note: data.time_info,
      isProtected: data.is_protected,
      requireEmail: data.require_email,
      requirePhone: data.require_phone,
      options: [...(data.schedule_options ?? [])]
        .map((option) => ({
          id: option.id,
          startAt: option.start_at,
          endAt: option.end_at,
          note: option.note,
        }))
        .sort((left, right) => left.startAt.localeCompare(right.startAt)),
    };

    return NextResponse.json(schedule);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
