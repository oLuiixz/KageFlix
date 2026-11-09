import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

export const runtime = "nodejs";
const COOKIE = "kageflix_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = body?.username;
    const password = body?.password;

    if (typeof username !== "string" || typeof password !== "string" ||
        !username.trim() || !password || username.length > 80 || password.length > 200) {
      return NextResponse.json({ error: "Informe usuário e senha válidos." }, { status: 400 });
    }

    if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET) {
      console.error("KageFlix authentication is not configured.");
      return NextResponse.json({ error: "O servidor de autenticação ainda não está configurado." }, { status: 503 });
    }

    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT id, username, password_hash, display_name, role, is_active
      FROM users
      WHERE LOWER(username) = LOWER(${username.trim()})
      LIMIT 1
    `;

    const user = rows[0] as {
      id: string;
      username: string;
      password_hash: string;
      display_name: string;
      role: "admin" | "member";
      is_active: boolean;
    } | undefined;

    const dummyHash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
    const passwordMatches = await bcrypt.compare(password, user?.password_hash || dummyHash);

    if (!user || !user.is_active || !passwordMatches) {
      return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
    }

    const token = await new SignJWT({
      username: user.username,
      displayName: user.display_name,
      role: user.role
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(process.env.AUTH_SECRET));

    await sql`UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = ${user.id}`;

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_SECONDS
    });
    return response;
  } catch (error) {
    console.error("KageFlix login error:", error);
    return NextResponse.json({ error: "Não foi possível validar seu acesso agora." }, { status: 500 });
  }
}
