import { compare } from "bcryptjs";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminTokenParamSchema } from "@/lib/validation/routes";
import { verifySchedulePasswordSchema } from "@/lib/validation/responses";

type AdminScheduleRow = {
  admin_token: string;
  admin_password_hash: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ adminToken: string }> },
) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = verifySchedulePasswordSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  try {
    const parsedParams = adminTokenParamSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid admin token" }, { status: 400 });
    }

    const { adminToken } = parsedParams.data;
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("schedules")
      .select("admin_token, admin_password_hash")
      .eq("admin_token", adminToken)
      .single<AdminScheduleRow>();

    if (error || !data) {
      return NextResponse.json({ error: "Admin schedule not found" }, { status: 404 });
    }

    const verified = await compare(parsed.data.password, data.admin_password_hash);

    if (!verified) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    return NextResponse.json({ verified: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
