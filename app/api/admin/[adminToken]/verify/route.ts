import { compare } from "bcryptjs";
import { NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/api/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { adminTokenParamSchema } from "@/lib/validation/routes";
import { verifySchedulePasswordSchema } from "@/lib/validation/responses";

type AdminScheduleRow = {
  admin_token: string;
  admin_password_hash: string;
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
    const rateLimit = await enforceRateLimit({
      request,
      supabase,
      maxRequests: 5,
      windowMs: 60_000,
      subjectType: "admin_verify",
      subjectKey: adminToken,
      countStatus: "failure",
      record: false,
    });

    if (!rateLimit.allowed) {
      await applyRandomDelay();

      return createFailureResponse(429);
    }

    const { data, error } = await supabase
      .from("schedules")
      .select("admin_token, admin_password_hash")
      .eq("admin_token", adminToken)
      .single<AdminScheduleRow>();

    if (error || !data) {
      await enforceRateLimit({
        request,
        supabase,
        maxRequests: 1,
        windowMs: 1,
        subjectType: "admin_verify",
        subjectKey: adminToken,
        skipCheck: true,
        status: "failure",
      });

      return createFailureResponse(401);
    }

    const verified = await compare(parsed.data.password, data.admin_password_hash);

    await enforceRateLimit({
      request,
      supabase,
      maxRequests: 1,
      windowMs: 1,
      subjectType: "admin_verify",
      subjectKey: adminToken,
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
