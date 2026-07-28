import { sign, verify, base64UrlEncodeString, base64UrlDecodeToString } from "./crypto";
import { SESSION_MAX_AGE_SECONDS } from "./constants";

interface SessionPayload {
  iat: number;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return secret;
}

/** Creates a signed `payload.signature` session token. No JWT library needed
 *  for a single boolean claim (logged in / not) — this is ~60 lines total
 *  between this file and lib/crypto.ts. Swap in `jose` if you later add
 *  richer claims and want a standardized format. */
export async function createSessionToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = { iat: now, exp: now + SESSION_MAX_AGE_SECONDS };
  const payloadB64 = base64UrlEncodeString(JSON.stringify(payload));
  const signature = await sign(payloadB64, getSecret());
  return `${payloadB64}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) return false;

  try {
    const valid = await verify(payloadB64, signature, getSecret());
    if (!valid) return false;

    const payload = JSON.parse(base64UrlDecodeToString(payloadB64)) as SessionPayload;
    return typeof payload.exp === "number" && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
