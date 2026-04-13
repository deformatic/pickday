import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { tokenParamSchema } from "@/lib/validation/routes";
import type { PublicSchedule } from "@/types/schedule";

type ScheduleRow = {
  id: number;
  token: string;
  is_protected: boolean;
  require_email: boolean;
  require_phone: boolean;
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
      .select("id, token, is_protected, require_email, require_phone")
      .eq("token", token)
      .single<ScheduleRow>();

    if (error || !data) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const schedule: PublicSchedule = {
      id: data.id,
      token: data.token,
      isProtected: data.is_protected,
      requireEmail: data.require_email,
      requirePhone: data.require_phone,
    };

    return NextResponse.json(schedule);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
