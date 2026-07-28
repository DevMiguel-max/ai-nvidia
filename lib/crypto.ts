/**
 * HMAC-SHA256 sign/verify built entirely on the Web Crypto API (crypto.subtle,
 * btoa/atob). These are available in BOTH the Edge runtime (middleware.ts)
 * and the Node.js runtime (API routes) on current Next.js/Vercel, so this one
 * module works everywhere without branching on runtime — no `Buffer`, no
 * Node-only `crypto` import here.
 */

function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBuffer(b64url: string): ArrayBuffer {
  const padLength = (4 - (b64url.length % 4)) % 4;
  const base64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLength);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function base64UrlEncodeString(str: string): string {
  return bufferToBase64Url(new TextEncoder().encode(str).buffer);
}

export function base64UrlDecodeToString(b64url: string): string {
  return new TextDecoder().decode(base64UrlToBuffer(b64url));
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function sign(message: string, secret: string): Promise<string> {
  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return bufferToBase64Url(signature);
}

export async function verify(message: string, signatureB64Url: string, secret: string): Promise<boolean> {
  const key = await getHmacKey(secret);
  try {
    return await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBuffer(signatureB64Url),
      new TextEncoder().encode(message)
    );
  } catch {
    return false;
  }
}
