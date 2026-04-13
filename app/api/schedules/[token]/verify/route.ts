import { compare } from "bcryptjs";
import { NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/api/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { tokenParamSchema } from "@/lib/validation/routes";
import { verifySchedulePasswordSchema } from "@/lib/validation/responses";

type ProtectedScheduleRow = {
  token: string;
  is_protected: boolean;
  access_password_hash: string | null;
};

const VERIFY_FAILURE_ERROR = "Unable to verify credentials";

function createFailureResponse(status: number) {
  return NextResponse.json({ error: VERIFY_FAILURE_ERROR }, { status });
}

async function applyRandomDelay() {
  const delayMs = 300 + Math.floor(Math.random() * 501);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

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

    const rateLimit = await enforceRateLimit({
      request,
      supabase,
      maxRequests: 5,
      windowMs: 60_000,
      subjectType: "schedule_verify",
      subjectKey: token,
      countStatus: "failure",
      record: false,
    });

    if (!rateLimit.allowed) {
      await applyRandomDelay();

      return createFailureResponse(429);
    }

    const { data, error } = await supabase
      .from("schedules")
      .select("token, is_protected, access_password_hash")
      .eq("token", token)
      .single<ProtectedScheduleRow>();

    if (error || !data) {
      await enforceRateLimit({
        request,
        supabase,
        maxRequests: 1,
        windowMs: 1,
        subjectType: "schedule_verify",
        subjectKey: token,
        skipCheck: true,
        status: "failure",
      });

      return createFailureResponse(401);
    }

    if (!data.is_protected) {
      await enforceRateLimit({
        request,
        supabase,
        maxRequests: 1,
        windowMs: 1,
        subjectType: "schedule_verify",
        subjectKey: token,
        skipCheck: true,
        status: "success",
      });

      return NextResponse.json({ verified: true });
    }

    if (!data.access_password_hash) {
      await enforceRateLimit({
        request,
        supabase,
        maxRequests: 1,
        windowMs: 1,
        subjectType: "schedule_verify",
        subjectKey: token,
        skipCheck: true,
        status: "failure",
      });

      return createFailureResponse(401);
    }

    const verified = await compare(parsed.data.password, data.access_password_hash);

    await enforceRateLimit({
      request,
      supabase,
      maxRequests: 1,
      windowMs: 1,
      subjectType: "schedule_verify",
      subjectKey: token,
      skipCheck: true,
      status: verified ? "success" : "failure",
    });

    if (!verified) {
      return createFailureResponse(401);
    }

    return NextResponse.json({ verified: true });
  } catch {
    return createFailureResponse(500);
  }
}
