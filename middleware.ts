import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

// Everything not listed here requires a valid session — secure by default,
// so any route you add later is protected unless you explicitly allow it.
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

console.log("=== MIDDLEWARE ===");
console.log("Path:", pathname);
console.log("Cookie:", token);

const isValid = await verifySessionToken(token);

console.log("Sessão válida:", isValid);

  if (!isValid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
