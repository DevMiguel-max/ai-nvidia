import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createSessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Hash both sides to a fixed length first so timingSafeEqual never throws
 *  on a length mismatch, and so the comparison itself doesn't leak timing
 *  information about the password's length. */
function timingSafeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const password = typeof body?.password === "string" ? body.password : "";

    const expected = process.env.APP_PASSWORD;
    if (!expected) {
      console.error("APP_PASSWORD is not configured");
      return NextResponse.json({ error: "Authentication is not available." }, { status: 500 });
    }

    if (!password || !timingSafeCompare(password, expected)) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    console.log("Login OK");
console.log("APP_PASSWORD:", !!expected);
const token = await createSessionToken();

console.log("Token criado:", token);
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
