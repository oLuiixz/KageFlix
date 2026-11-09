import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("kageflix_session")?.value;
  const secret = process.env.AUTH_SECRET;

  if (!token || !secret) return NextResponse.redirect(new URL("/", request.url));

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("kageflix_session");
    return response;
  }
}

export const config = { matcher: ["/inicio/:path*", "/admin/:path*"] };
