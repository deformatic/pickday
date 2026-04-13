import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RateLimitStatus = "success" | "failure";
type RateLimitSubjectType = "ip" | "schedule_verify" | "admin_verify" | "schedule_create" | "response_submit";

export async function enforceRateLimit({
  request,
  supabase,
  maxRequests,
  windowMs,
  subjectType = "ip",
  subjectKey,
  countStatus = "all",
  record = true,
  status,
  skipCheck = false,
}: {
  request: Request;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  maxRequests: number;
  windowMs: number;
  subjectType?: RateLimitSubjectType;
  subjectKey?: string;
  countStatus?: "all" | RateLimitStatus;
  record?: boolean;
  status?: RateLimitStatus;
  skipCheck?: boolean;
}) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const normalizedSubjectKey = subjectKey ?? ip;

  if (!skipCheck) {
    const threshold = new Date(Date.now() - windowMs).toISOString();
    let countQuery = supabase
      .from("rate_limit_log")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("subject_type", subjectType)
      .eq("subject_key", normalizedSubjectKey)
      .gte("created_at", threshold);

    if (countStatus !== "all") {
      countQuery = countQuery.eq("status", countStatus);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw new Error("Failed to check rate limit");
    }

    if ((count ?? 0) >= maxRequests) {
      return {
        allowed: false,
        ip,
      };
    }
  }

  if (record) {
    const { error: insertError } = await supabase.from("rate_limit_log").insert({
      ip,
      subject_type: subjectType,
      subject_key: normalizedSubjectKey,
      status: status ?? "success",
    });

    if (insertError) {
      throw new Error("Failed to record rate limit");
    }
  }

  return {
    allowed: true,
    ip,
  };
}
