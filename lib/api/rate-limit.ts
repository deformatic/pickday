import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function enforceRateLimit({
  request,
  supabase,
  maxRequests,
  windowMs,
}: {
  request: Request;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  maxRequests: number;
  windowMs: number;
}) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const threshold = new Date(Date.now() - windowMs).toISOString();

  const { count, error: countError } = await supabase
    .from("rate_limit_log")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", threshold);

  if (countError) {
    throw new Error("Failed to check rate limit");
  }

  if ((count ?? 0) >= maxRequests) {
    return {
      allowed: false,
      ip,
    };
  }

  const { error: insertError } = await supabase.from("rate_limit_log").insert({ ip });

  if (insertError) {
    throw new Error("Failed to record rate limit");
  }

  return {
    allowed: true,
    ip,
  };
}
