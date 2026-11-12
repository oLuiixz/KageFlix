import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "kageflix_session";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;
  const pathname = request.nextUrl.pathname;

  // A valid session should reopen directly in the app, including when the
  // user launches the installed PWA from its home-screen icon.
  if (token && secret) {
    try {
      await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
      if (pathname === "/") {
        return NextResponse.redirect(new URL("/inicio", request.url));
      }
      return NextResponse.next();
    } catch {
      const response = pathname === "/"
        ? NextResponse.next()
        : NextResponse.redirect(new URL("/", request.url));
      response.cookies.delete(COOKIE);
      return response;
    }
  }

  if (pathname === "/") return NextResponse.next();
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = { matcher: ["/", "/inicio/:path*", "/admin/:path*"] };
