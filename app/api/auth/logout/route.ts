import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
