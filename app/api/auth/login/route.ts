import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { SignJWT } from "jose";
import { encryptPrivateValue, validatePlaylistUrl } from "@/lib/catalog";

export const runtime = "nodejs";
const COOKIE = "kageflix_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

async function validateIptvAccount(username: string, password: string) {
  // Sigma DNS is Xtream-compatible. Credentials are checked directly against its Player API.
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

function buildSubscriberPlaylistUrl(username: string, password: string) {
  const url = new URL("/get.php", "http://xmrs2.top");
  url.searchParams.set("username", username);
  url.searchParams.set("password", password);
  url.searchParams.set("type", "m3u_plus");
  url.searchParams.set("output", "m");
  return validatePlaylistUrl(url.toString())?.toString() ?? null;
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

    // First authenticate against Sigma. KageFlix does not require a pre-created customer record.
    const upstream = await validateIptvAccount(username.trim(), password);
    if (upstream.unavailable) {
      return NextResponse.json({ error: "O servidor IPTV está temporariamente indisponível. Tente novamente." }, { status: 503 });
    }
    if (!upstream.valid) {
      return NextResponse.json({ error: "Usuário ou senha incorretos, ou assinatura IPTV expirada/bloqueada." }, { status: 401 });
    }

    const playlistUrl = buildSubscriberPlaylistUrl(username.trim(), password);
    if (!playlistUrl) {
      return NextResponse.json({ error: "Não foi possível preparar a conexão deste usuário." }, { status: 503 });
    }

    // Automatically provision the KageFlix member after Sigma confirms the credentials.
    // Preserve existing member IDs/devices; never convert an administrator into a member.
    let rows = await sql`
      SELECT id, username, display_name, role, is_active
      FROM users
      WHERE LOWER(username) = LOWER(${username.trim()})
      LIMIT 1
    `;
    let user = rows[0] as {
      id: string;
      username: string;
      display_name: string;
      role: "admin" | "member";
      is_active: boolean;
    } | undefined;

    if (!user) {
      try {
        const created = await sql`
          INSERT INTO users (username, password_hash, display_name, role, is_active)
          VALUES (${username.trim()}, NULL, ${username.trim()}, 'member', TRUE)
          RETURNING id, username, display_name, role, is_active
        `;
        user = created[0] as typeof user;
      } catch (error) {
        // A simultaneous first login may have inserted the same username.
        const retry = await sql`
          SELECT id, username, display_name, role, is_active
          FROM users
          WHERE LOWER(username) = LOWER(${username.trim()})
          LIMIT 1
        `;
        user = retry[0] as typeof user;
        if (!user) throw error;
      }
    }

    if (!user || user.role !== "member" || !user.is_active) {
      return NextResponse.json({ error: "Esta conta não está autorizada a acessar o aplicativo." }, { status: 403 });
    }

    // Store this subscriber's own M3U encrypted at rest; never return it to the browser.
    const encrypted = encryptPrivateValue(playlistUrl, "user-iptv-playlist-url");
    await sql`
      INSERT INTO user_iptv_sources (user_id, encrypted_playlist_url, playlist_url_iv, playlist_url_auth_tag)
      VALUES (${user.id}, ${encrypted.encrypted}, ${encrypted.iv}, ${encrypted.authTag})
      ON CONFLICT (user_id) DO UPDATE SET
        encrypted_playlist_url = EXCLUDED.encrypted_playlist_url,
        playlist_url_iv = EXCLUDED.playlist_url_iv,
        playlist_url_auth_tag = EXCLUDED.playlist_url_auth_tag,
        updated_at = NOW()
    `;

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
