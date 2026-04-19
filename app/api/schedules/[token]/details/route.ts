import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getScheduleSessionCookieName, verifyScheduleSessionToken } from "@/lib/server/auth-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { tokenParamSchema } from "@/lib/validation/routes";
import type { VerifiedScheduleDetails } from "@/types/schedule";

type ScheduleDetailsRow = {
  id: number;
  token: string;
  title: string;
  location: string;
  time_info: string;
  is_protected: boolean;
  require_email: boolean;
  require_phone: boolean;
  access_password_hash: string | null;
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
        "id, token, title, location, time_info, is_protected, require_email, require_phone, access_password_hash, schedule_options(id, start_at, end_at, note)",
      )
      .eq("token", token)
      .single<ScheduleDetailsRow>();

    if (error || !data) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    if (data.is_protected) {
      const sessionToken = (await cookies()).get(getScheduleSessionCookieName(token))?.value;

      if (!sessionToken || !verifyScheduleSessionToken(sessionToken, token)) {
        return NextResponse.json({ error: "Schedule session is required" }, { status: 401 });
      }
    }

    const schedule: VerifiedScheduleDetails = {
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
