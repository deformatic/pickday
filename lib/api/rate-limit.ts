import { createHash } from "node:crypto";
import { isIP } from "node:net";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ClientIpInfo = {
  key: string;
  usedFallback: boolean;
};

type RateLimitBucketOptions = {
  clientIpInfo?: ClientIpInfo;
  bucketKey?: string;
};

function isTrustedProxyEnvironment() {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_URL);
}

function normalizeIpCandidate(candidate: string) {
  const normalized = candidate.trim().replace(/^"|"$/g, "");

  if (!normalized || normalized.length > 64) {
    return null;
  }

  const withoutPort = normalized.startsWith("[")
    ? normalized.replace(/^\[([^\]]+)\](?::\d+)?$/, "$1")
    : normalized.replace(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/, "$1");

  return isIP(withoutPort) ? withoutPort : null;
}

function createFallbackKey(request: Request) {
  const userAgent = request.headers.get("user-agent")?.slice(0, 200) ?? "unknown-agent";
  const acceptLanguage = request.headers.get("accept-language")?.slice(0, 120) ?? "unknown-language";
  const hash = createHash("sha256").update(`${userAgent}::${acceptLanguage}`).digest("hex");

  return `fallback:${hash}`;
}

export function extractClientIp(request: Request): ClientIpInfo {
  if (isTrustedProxyEnvironment()) {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const candidates = forwardedFor
      ?.split(",")
      .map((value) => normalizeIpCandidate(value))
      .filter((value): value is string => value !== null);

    if (candidates && candidates.length > 0) {
      return { key: candidates[0], usedFallback: false };
    }
  }

  const realIp = normalizeIpCandidate(request.headers.get("x-real-ip") ?? "");

  if (realIp) {
    return { key: realIp, usedFallback: false };
  }

  return {
    key: createFallbackKey(request),
    usedFallback: true,
  };
}

function hashSubjectKey(subjectKey: string) {
  return createHash("sha256").update(subjectKey).digest("hex");
}

export function createScopedRateLimitBucketKey({
  request,
  scope,
  subjectKey,
  clientIpInfo,
}: {
  request: Request;
  scope: string;
  subjectKey: string;
  clientIpInfo?: ClientIpInfo;
}) {
  const clientIp = clientIpInfo ?? extractClientIp(request);

  return `${scope}:${clientIp.key}:${hashSubjectKey(subjectKey)}`;
}

export async function enforceRateLimit({
  request,
  supabase,
  maxRequests,
  windowMs,
  clientIpInfo,
  bucketKey,
}: {
  request: Request;
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  maxRequests: number;
  windowMs: number;
} & RateLimitBucketOptions) {
  const clientIp = clientIpInfo ?? extractClientIp(request);
  const resolvedBucketKey = bucketKey ?? clientIp.key;
  const effectiveMaxRequests = clientIp.usedFallback ? Math.max(1, Math.floor(maxRequests / 2)) : maxRequests;
  const threshold = new Date(Date.now() - windowMs).toISOString();

  const { count, error: countError } = await supabase
    .from("rate_limit_log")
    .select("id", { count: "exact", head: true })
    .eq("ip", resolvedBucketKey)
    .gte("created_at", threshold);

  if (countError) {
    throw new Error("Failed to check rate limit");
  }

  if ((count ?? 0) >= effectiveMaxRequests) {
    return {
      allowed: false,
      ip: clientIp.key,
      bucketKey: resolvedBucketKey,
      usedFallback: clientIp.usedFallback,
    };
  }

  const { error: insertError } = await supabase.from("rate_limit_log").insert({ ip: resolvedBucketKey });

  if (insertError) {
    throw new Error("Failed to record rate limit");
  }

  return {
    allowed: true,
    ip: clientIp.key,
    bucketKey: resolvedBucketKey,
    usedFallback: clientIp.usedFallback,
  };
}
