import { compare } from "bcryptjs";
import { NextResponse } from "next/server";

import { createScopedRateLimitBucketKey, enforceRateLimit, extractClientIp } from "@/lib/api/rate-limit";
import {
  createScheduleSessionToken,
  getScheduleSessionCookieName,
  getSessionCookieOptions,
} from "@/lib/server/auth-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { tokenParamSchema } from "@/lib/validation/routes";
import { verifySchedulePasswordSchema } from "@/lib/validation/responses";

type ProtectedScheduleRow = {
  token: string;
  is_protected: boolean;
  access_password_hash: string | null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
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
    const parsedParams = tokenParamSchema.safeParse(await params);

    if (!parsedParams.success) {
      return NextResponse.json({ error: "Invalid schedule token" }, { status: 400 });
    }

    const { token } = parsedParams.data;
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
        scope: "schedule_verify",
        subjectKey: token,
        clientIpInfo: clientIp,
      }),
    });

    if (!tokenRateLimit.allowed) {
      return NextResponse.json({ error: "Too many verification attempts. Try again later." }, { status: 429 });
    }

    const { data, error } = await supabase
      .from("schedules")
      .select("token, is_protected, access_password_hash")
      .eq("token", token)
      .single<ProtectedScheduleRow>();

    if (error || !data) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    if (!data.is_protected) {
      return NextResponse.json({ verified: true });
    }

    if (!data.access_password_hash) {
      return NextResponse.json({ error: "Schedule password is not configured" }, { status: 500 });
    }

    let password = parsed.data.password;
    const verified = await compare(password, data.access_password_hash);
    password = "";

    if (!verified) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const response = NextResponse.json({ verified: true });
    response.cookies.set(
      getScheduleSessionCookieName(token),
      createScheduleSessionToken(token),
      getSessionCookieOptions(),
    );

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
