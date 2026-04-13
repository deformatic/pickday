import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_TTL_SECONDS = 60 * 15;
const ADMIN_COOKIE_PREFIX = "pickday_admin_session_";
const SCHEDULE_COOKIE_PREFIX = "pickday_schedule_session_";

type SessionScope = "admin" | "schedule";

type SessionPayload = {
  scope: SessionScope;
  token: string;
  exp: number;
};

function encodeBase64Url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function decodeBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("AUTH_SESSION_SECRET is required");
  }

  return secret;
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function buildToken(payload: SessionPayload) {
  const payloadJson = JSON.stringify(payload);
  const encodedPayload = encodeBase64Url(payloadJson);
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function parseToken(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = signPayload(encodedPayload);

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(encodedPayload)) as SessionPayload;
  } catch {
    return null;
  }
}

export function getAdminSessionCookieName(adminToken: string) {
  return `${ADMIN_COOKIE_PREFIX}${adminToken}`;
}

export function getScheduleSessionCookieName(token: string) {
  return `${SCHEDULE_COOKIE_PREFIX}${token}`;
}

export function createAdminSessionToken(adminToken: string) {
  return buildToken({
    scope: "admin",
    token: adminToken,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
}

export function createScheduleSessionToken(token: string) {
  return buildToken({
    scope: "schedule",
    token,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  });
}

export function verifyAdminSessionToken(sessionToken: string, adminToken: string) {
  const parsed = parseToken(sessionToken);

  if (!parsed) {
    return false;
  }

  return parsed.scope === "admin" && parsed.token === adminToken && parsed.exp > Math.floor(Date.now() / 1000);
}

export function verifyScheduleSessionToken(sessionToken: string, token: string) {
  const parsed = parseToken(sessionToken);

  if (!parsed) {
    return false;
  }

  return parsed.scope === "schedule" && parsed.token === token && parsed.exp > Math.floor(Date.now() / 1000);
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
