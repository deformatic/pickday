import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/api/rate-limit";
import { writeResponseAuditLog } from "@/lib/api/response-audit-log";
import { createResponseEditToken, hashResponseEditToken } from "@/lib/security/response-edit-token";
import { getScheduleSessionCookieName, verifyScheduleSessionToken } from "@/lib/server/auth-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { tokenResponseRouteParamSchema } from "@/lib/validation/routes";
import { updateScheduleResponseSchema } from "@/lib/validation/responses";

type ScheduleRow = {
  id: number;
  token: string;
  is_protected: boolean;
  require_email: boolean;
  require_phone: boolean;
  schedule_options: Array<{ id: number }> | null;
};

type ResponseRow = {
  id: number;
  schedule_id: number;
  edit_token_hash: string | null;
  edit_token_expires_at: string | null;
};

type InstructorIdentityRow = {
  id: number;
};

function normalizeOptionalValue(value: string | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

async function findExistingInstructorIdentity(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  name: string,
  email: string | null,
  phone: string | null,
) {
  let query = supabase.from("instructor_identities").select("id").eq("name", name).limit(1);

  query = email === null ? query.is("email", null) : query.eq("email", email);
  query = phone === null ? query.is("phone", null) : query.eq("phone", phone);

  const { data, error } = await query.single<InstructorIdentityRow>();

  if (error || !data) {
    return null;
  }

  return data.id;
}

async function upsertInstructorIdentity(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  name: string,
  email: string | null,
  phone: string | null,
) {
  if (email === null && phone === null) {
    return null;
  }

  const existingId = await findExistingInstructorIdentity(supabase, name, email, phone);

  if (existingId !== null) {
    return existingId;
  }

  const { data, error } = await supabase
    .from("instructor_identities")
    .insert({
      name,
      email,
      phone,
    })
    .select("id")
    .single<InstructorIdentityRow>();

  if (error || !data) {
    throw new Error("Failed to save instructor identity");
  }

  return data.id;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string; responseId: string }> },
) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsedBody = updateScheduleResponseSchema.safeParse(payload);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid response payload" }, { status: 400 });
  }

  const parsedParams = tokenResponseRouteParamSchema.safeParse(await params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid route parameters" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { token, responseId } = parsedParams.data;

    const { data: schedule, error: scheduleError } = await supabase
      .from("schedules")
      .select("id, token, is_protected, require_email, require_phone, schedule_options(id)")
      .eq("token", token)
      .single<ScheduleRow>();

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    if (schedule.is_protected) {
      const sessionToken = (await cookies()).get(getScheduleSessionCookieName(token))?.value;

      if (!sessionToken || !verifyScheduleSessionToken(sessionToken, token)) {
        return NextResponse.json({ error: "Schedule session is required" }, { status: 401 });
      }
    }

    const { data: response, error: responseError } = await supabase
      .from("responses")
      .select("id, schedule_id, edit_token_hash, edit_token_expires_at")
      .eq("id", responseId)
      .single<ResponseRow>();

    if (responseError || !response || response.schedule_id !== schedule.id) {
      return NextResponse.json({ error: "Response not found for this schedule" }, { status: 404 });
    }

    if (!response.edit_token_hash || !response.edit_token_expires_at) {
      return NextResponse.json({ error: "Edit link is unavailable for this response" }, { status: 403 });
    }

    const submittedTokenHash = hashResponseEditToken(parsedBody.data.editToken);
    const isExpired = new Date(response.edit_token_expires_at).getTime() <= Date.now();

    if (isExpired || submittedTokenHash !== response.edit_token_hash) {
      return NextResponse.json({ error: "Edit link is invalid or expired" }, { status: 403 });
    }

    const email = normalizeOptionalValue(parsedBody.data.email);
    const phone = normalizeOptionalValue(parsedBody.data.phone);

    if (schedule.require_email && email === null) {
      return NextResponse.json({ error: "Email is required for this schedule" }, { status: 400 });
    }

    if (schedule.require_phone && phone === null) {
      return NextResponse.json({ error: "Phone number is required for this schedule" }, { status: 400 });
    }

    const validOptionIds = new Set((schedule.schedule_options ?? []).map((option) => option.id));
    const hasInvalidOption = parsedBody.data.selectedOptionIds.some((optionId) => !validOptionIds.has(optionId));

    if (hasInvalidOption) {
      return NextResponse.json({ error: "Selected options must belong to the schedule" }, { status: 400 });
    }

    const rateLimit = await enforceRateLimit({
      request,
      supabase,
      maxRequests: 10,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many responses from this IP. Try again later." }, { status: 429 });
    }

    const instructorIdentityId = await upsertInstructorIdentity(
      supabase,
      parsedBody.data.name,
      email,
      phone,
    );
    const nextToken = createResponseEditToken();

    const { error: updateError } = await supabase
      .from("responses")
      .update({
        instructor_identity_id: instructorIdentityId,
        name: parsedBody.data.name,
        email,
        phone,
        comment: normalizeOptionalValue(parsedBody.data.comment),
        edit_token_hash: nextToken.tokenHash,
        edit_token_expires_at: nextToken.expiresAt,
        edit_token_rotated_at: nextToken.rotatedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", responseId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update response" }, { status: 500 });
    }

    const { error: deleteError } = await supabase
      .from("response_selected_options")
      .delete()
      .eq("response_id", responseId);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to refresh selected options" }, { status: 500 });
    }

    const selectedOptions = parsedBody.data.selectedOptionIds.map((optionId) => ({
      response_id: responseId,
      option_id: optionId,
    }));

    const { error: selectedOptionsError } = await supabase
      .from("response_selected_options")
      .insert(selectedOptions);

    if (selectedOptionsError) {
      return NextResponse.json({ error: "Failed to save selected options" }, { status: 500 });
    }

    await writeResponseAuditLog({
      supabase,
      responseId,
      action: "public_response_edit",
      actorType: "public_token",
      actorIdentifier: token,
    });

    const editUrl = `/s/${token}/respond?responseId=${responseId}&editToken=${encodeURIComponent(nextToken.rawToken)}`;

    return NextResponse.json({
      responseId,
      updated: true,
      editUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
