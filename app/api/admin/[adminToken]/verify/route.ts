import { compare } from "bcryptjs";
import { NextResponse } from "next/server";

import { createScopedRateLimitBucketKey, enforceRateLimit, extractClientIp } from "@/lib/api/rate-limit";
import {
  createAdminSessionToken,
  getAdminSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/server/auth-session";
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
    const clientIp = extractClientIp(request);
    const globalRateLimit = await enforceRateLimit({
      request,
      supabase,
      maxRequests: 8,
      windowMs: 60_000,
      clientIpInfo: clientIp,
    });

    if (!globalRateLimit.allowed) {
      return NextResponse.json({ error: "Too many verification attempts. Try again later." }, { status: 429 });
    }

    const tokenRateLimit = await enforceRateLimit({
      request,
      supabase,
      maxRequests: 8,
      windowMs: 60_000,
      clientIpInfo: clientIp,
      bucketKey: createScopedRateLimitBucketKey({
        request,
        scope: "admin_verify",
        subjectKey: adminToken,
        clientIpInfo: clientIp,
      }),
    });

    if (!tokenRateLimit.allowed) {
      return NextResponse.json({ error: "Too many verification attempts. Try again later." }, { status: 429 });
    }

    const { data, error } = await supabase
      .from("schedules")
      .select("admin_token, admin_password_hash")
      .eq("admin_token", adminToken)
      .single<AdminScheduleRow>();

    if (error || !data) {
      return NextResponse.json({ error: "Admin schedule not found" }, { status: 404 });
    }

    let password = parsed.data.password;
    const verified = await compare(password, data.admin_password_hash);
    password = "";

    if (!verified) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const response = NextResponse.json({ verified: true });
    response.cookies.set(
      getAdminSessionCookieName(adminToken),
      createAdminSessionToken(adminToken),
      getSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
