import { compare } from "bcryptjs";
import { NextResponse } from "next/server";

import {
  ADMIN_AUTH_COOKIE_NAME,
  issueAdminAuthToken,
} from "@/lib/admin-auth-token";
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

    const authToken = issueAdminAuthToken(adminToken);
    const response = NextResponse.json({
      verified: true,
      expiresAt: new Date(authToken.expiresAt * 1000).toISOString(),
    });

    response.cookies.set({
      name: ADMIN_AUTH_COOKIE_NAME,
      value: authToken.token,
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: authToken.ttlSeconds,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
