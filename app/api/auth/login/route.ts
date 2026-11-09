import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { SignJWT } from "jose";
import { decryptPrivateValue, validatePlaylistUrl } from "@/lib/catalog";

export const runtime = "nodejs";
const COOKIE = "kageflix_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

async function validateIptvAccount(playlistUrlValue: string, username: string, password: string) {
  const playlistUrl = validatePlaylistUrl(playlistUrlValue);
  if (!playlistUrl) return { valid: false as const, unavailable: false };

  // The stored M3U belongs to this exact subscriber. Its credentials are encrypted in Neon.
  const storedUsername = playlistUrl.searchParams.get("username");
  if (!storedUsername || storedUsername.toLowerCase() !== username.toLowerCase()) {
    return { valid: false as const, unavailable: false };
  }

  // Sigma's DNS is Xtream-compatible: use its built-in Player API, not a separate API key.
  const endpoint = new URL("/player_api.php", "http://xmrs2.top");
  endpoint.searchParams.set("username", username);
  endpoint.searchParams.set("password", password);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return { valid: false as const, unavailable: true };
    const data = await response.json();
    const info = data?.user_info;
    if (!info || (info.auth !== 1 && info.auth !== "1")) {
      return { valid: false as const, unavailable: false };
    }
    if (typeof info.username === "string" && info.username.toLowerCase() !== username.toLowerCase()) {
      return { valid: false as const, unavailable: false };
    }
    // Some Xtream-compatible panels omit status and rely on auth=1.
    // If status is present, reject only explicitly inactive/blocked/expired states.
    if (typeof info.status === "string" &&
        !["active", "enabled", "1"].includes(info.status.trim().toLowerCase())) {
      return { valid: false as const, unavailable: false };
    }
    const expiry = Number(info.exp_date);
    if (Number.isFinite(expiry) && expiry > 0 && expiry * 1000 <= Date.now()) {
      return { valid: false as const, unavailable: false };
    }
    return { valid: true as const, unavailable: false };
  } catch {
    return { valid: false as const, unavailable: true };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = body?.username;
    const password = body?.password;
    const deviceId = body?.deviceId;
    const deviceLabel = typeof body?.deviceLabel === "string" ? body.deviceLabel.slice(0, 120) : "Dispositivo";

    if (typeof username !== "string" || typeof password !== "string" ||
        !username.trim() || !password || username.length > 80 || password.length > 200 ||
        typeof deviceId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(deviceId)) {
      return NextResponse.json({ error: "Informe usuário e senha válidos." }, { status: 400 });
    }

    if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET) {
      console.error("KageFlix authentication is not configured.");
      return NextResponse.json({ error: "O servidor de autenticação ainda não está configurado." }, { status: 503 });
    }

    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT u.id, u.username, u.password_hash, u.display_name, u.role, u.is_active,
             s.encrypted_playlist_url, s.playlist_url_iv, s.playlist_url_auth_tag
      FROM users u
      LEFT JOIN user_iptv_sources s ON s.user_id = u.id
      WHERE LOWER(u.username) = LOWER(${username.trim()})
      LIMIT 1
    `;

    const user = rows[0] as {
      id: string;
      username: string;
      password_hash: string | null;
      display_name: string;
      role: "admin" | "member";
      is_active: boolean;
      encrypted_playlist_url: Buffer | Uint8Array | null;
      playlist_url_iv: Buffer | Uint8Array | null;
      playlist_url_auth_tag: Buffer | Uint8Array | null;
    } | undefined;

    if (!user || !user.is_active) {
      await bcrypt.compare(password, DUMMY_HASH);
      return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
    }

    if (user.role === "admin") {
      const passwordMatches = await bcrypt.compare(password, user.password_hash || DUMMY_HASH);
      if (!passwordMatches) {
        return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
      }
    } else {
      if (!user.encrypted_playlist_url || !user.playlist_url_iv || !user.playlist_url_auth_tag) {
        return NextResponse.json({ error: "Esta conta ainda não possui uma conexão IPTV configurada." }, { status: 403 });
      }
      let playlistUrl: string;
      try {
        playlistUrl = decryptPrivateValue(
          Buffer.from(user.encrypted_playlist_url),
          Buffer.from(user.playlist_url_iv),
          Buffer.from(user.playlist_url_auth_tag),
          "user-iptv-playlist-url"
        );
      } catch {
        console.error("KageFlix could not decrypt the subscriber source.");
        return NextResponse.json({ error: "Não foi possível validar esta conta. Contate o administrador." }, { status: 503 });
      }

      const upstream = await validateIptvAccount(playlistUrl, user.username, password);
      if (upstream.unavailable) {
        return NextResponse.json({ error: "O servidor IPTV está temporariamente indisponível. Tente novamente." }, { status: 503 });
      }
      if (!upstream.valid) {
        return NextResponse.json({ error: "Usuário ou senha incorretos, ou assinatura IPTV expirada/bloqueada." }, { status: 401 });
      }
    }

    const deviceKeyHash = createHash("sha256").update(deviceId).digest("hex");
    const deviceRows = await sql`
      INSERT INTO user_devices (user_id, device_key_hash, device_label)
      VALUES (${user.id}, ${deviceKeyHash}, ${deviceLabel || "Dispositivo"})
      ON CONFLICT (user_id, device_key_hash) DO UPDATE
        SET device_label = EXCLUDED.device_label, last_seen_at = NOW()
        WHERE user_devices.revoked_at IS NULL
      RETURNING id
    `;
    if (!deviceRows.length) {
      return NextResponse.json({ error: "Este dispositivo não está autorizado. Entre em contato com o administrador." }, { status: 403 });
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
