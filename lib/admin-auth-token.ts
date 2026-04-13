import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const ADMIN_AUTH_COOKIE_NAME = "pd_admin_auth";

const ADMIN_AUTH_TTL_SECONDS = 60 * 10;
const TOKEN_VERSION = "v1";

type AdminAuthTokenClaims = {
  adminToken: string;
  exp: number;
  jti: string;
};

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getAdminAuthTokenSecret() {
  const secret = process.env.ADMIN_AUTH_TOKEN_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_AUTH_TOKEN_SECRET must be set and at least 32 characters long");
  }

  return secret;
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getAdminAuthTokenSecret()).update(encodedPayload).digest("base64url");
}

export function issueAdminAuthToken(adminToken: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_AUTH_TTL_SECONDS;
  const claims: AdminAuthTokenClaims = {
    adminToken,
    exp: expiresAt,
    jti: randomUUID(),
  };

  const encodedPayload = toBase64Url(JSON.stringify(claims));
  const signature = signPayload(encodedPayload);

  return {
    token: `${TOKEN_VERSION}.${encodedPayload}.${signature}`,
    expiresAt,
    ttlSeconds: ADMIN_AUTH_TTL_SECONDS,
  };
}

export function verifyAdminAuthToken(token: string, expectedAdminToken: string) {
  const [version, encodedPayload, signature] = token.split(".");

  if (version !== TOKEN_VERSION || !encodedPayload || !signature) {
    return { valid: false as const, reason: "malformed" };
  }

  const expectedSignature = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return { valid: false as const, reason: "invalid-signature" };
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as Partial<AdminAuthTokenClaims>;

    if (
      typeof payload.adminToken !== "string"
      || typeof payload.exp !== "number"
      || typeof payload.jti !== "string"
      || payload.jti.length < 8
    ) {
      return { valid: false as const, reason: "invalid-claims" };
    }

    if (payload.adminToken !== expectedAdminToken) {
      return { valid: false as const, reason: "token-mismatch" };
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return { valid: false as const, reason: "expired" };
    }

    return { valid: true as const, claims: payload as AdminAuthTokenClaims };
  } catch {
    return { valid: false as const, reason: "invalid-payload" };
  }
}

export function getAdminAuthTokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization")?.trim();

  if (authorization?.startsWith("Bearer ")) {
    const bearerToken = authorization.slice(7).trim();

    if (bearerToken.length > 0) {
      return bearerToken;
    }
  }

  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  for (const chunk of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = chunk.trim().split("=");

    if (rawName !== ADMIN_AUTH_COOKIE_NAME) {
      continue;
    }

    const rawValue = rawValueParts.join("=");

    if (rawValue.length === 0) {
      return null;
    }

    return decodeURIComponent(rawValue);
  }

  return null;
}
