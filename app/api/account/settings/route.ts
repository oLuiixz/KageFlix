import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { neon } from "@neondatabase/serverless";
import { decryptPrivateValue } from "@/lib/catalog";

export const runtime = "nodejs";
const COOKIE = "kageflix_session";

export async function GET() {
  const secret = process.env.AUTH_SECRET;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!secret || !token || !process.env.DATABASE_URL) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT u.username, u.display_name, u.created_at, u.last_login_at,
             s.encrypted_playlist_url, s.playlist_url_iv, s.playlist_url_auth_tag
      FROM users u LEFT JOIN user_iptv_sources s ON s.user_id = u.id
      WHERE u.id = ${payload.sub} AND u.role = 'member' AND u.is_active = TRUE LIMIT 1
    `;
    if (!rows.length) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    const row = rows[0];
    let plan = { status: "Indisponível", expiresAt: null as string | null, trial: false, maxConnections: null as string | null, activeConnections: null as string | null };
    if (row.encrypted_playlist_url) {
      try {
        const playlistUrl = decryptPrivateValue(Buffer.from(row.encrypted_playlist_url), Buffer.from(row.playlist_url_iv), Buffer.from(row.playlist_url_auth_tag), "user-iptv-playlist-url");
        const parsed = new URL(playlistUrl);
        const api = new URL("/player_api.php", parsed.origin);
        api.searchParams.set("username", parsed.searchParams.get("username") || "");
        api.searchParams.set("password", parsed.searchParams.get("password") || "");
        const response = await fetch(api, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } });
        if (response.ok) {
          const data = await response.json();
          const info = data?.user_info || {};
          const expiry = Number(info.exp_date);
          plan = {
            status: String(info.status || (info.auth === 1 ? "Ativo" : "Indisponível")),
            expiresAt: Number.isFinite(expiry) && expiry > 0 ? new Date(expiry * 1000).toISOString() : null,
            trial: info.is_trial === "1" || info.is_trial === 1,
            maxConnections: info.max_connections == null ? null : String(info.max_connections),
            activeConnections: info.active_cons == null ? null : String(info.active_cons)
          };
        }
      } catch { /* Keep safe fallback plan details. */ }
    }
    return NextResponse.json({
      account: { username: row.username, displayName: row.display_name, createdAt: row.created_at, lastLoginAt: row.last_login_at, playlistConnected: Boolean(row.encrypted_playlist_url) },
      plan
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar as configurações." }, { status: 500 });
  }
}
