import { createHash, randomBytes } from "crypto";

export const RESPONSE_EDIT_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export function createResponseEditToken() {
  const rawToken = randomBytes(24).toString("base64url");

  return {
    rawToken,
    tokenHash: hashResponseEditToken(rawToken),
    expiresAt: new Date(Date.now() + RESPONSE_EDIT_TOKEN_TTL_MS).toISOString(),
    rotatedAt: new Date().toISOString(),
  };
}

export function hashResponseEditToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
