import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { encryptPrivateValue, validatePlaylistUrl } from "@/lib/catalog";

export const runtime = "nodejs";
const COOKIE = "kageflix_session";

async function requireAdmin() {
  const secret = process.env.AUTH_SECRET;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!secret || !token) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return payload.role === "admin";
  } catch { return false; }
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Banco de dados não configurado." }, { status: 503 });
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
      SELECT u.id, u.username, u.display_name, u.is_active, u.created_at,
             (s.user_id IS NOT NULL) AS has_playlist,
             COUNT(i.id)::int AS item_count
      FROM users u
      LEFT JOIN user_iptv_sources s ON s.user_id = u.id
      LEFT JOIN user_catalog_items i ON i.user_id = u.id AND i.is_available = TRUE
      WHERE u.role = 'member'
      GROUP BY u.id, s.user_id
      ORDER BY u.created_at DESC
      LIMIT 200
    `;
    return NextResponse.json({ clients: rows.map((r) => ({
      id: r.id, username: r.username, displayName: r.display_name,
      active: r.is_active, hasPlaylist: r.has_playlist, itemCount: Number(r.item_count || 0)
    })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("KageFlix clients list failed:", error);
    return NextResponse.json({ error: "Não foi possível carregar os clientes." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET) return NextResponse.json({ error: "Servidor não configurado." }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }

  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const playlistUrl = validatePlaylistUrl(body.playlistUrl);

  if (displayName.length < 2 || displayName.length > 100) return NextResponse.json({ error: "Informe o nome do cliente (2 a 100 caracteres)." }, { status: 400 });
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) return NextResponse.json({ error: "O usuário deve ter de 3 a 40 caracteres: letras, números, ponto, hífen ou underline." }, { status: 400 });
  if (password.length < 10 || password.length > 200) return NextResponse.json({ error: "A senha deve ter pelo menos 10 caracteres." }, { status: 400 });
  if (!playlistUrl) return NextResponse.json({ error: "Informe uma URL M3U válida do domínio autorizado do servidor." }, { status: 400 });

  const sql = neon(process.env.DATABASE_URL);
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await sql`
      INSERT INTO users (username, password_hash, display_name, role, is_active)
      VALUES (${username}, ${passwordHash}, ${displayName}, 'member', TRUE)
      RETURNING id, username, display_name
    `;
    const encrypted = encryptPrivateValue(playlistUrl.toString(), "user-iptv-playlist-url");
    try {
      await sql`
        INSERT INTO user_iptv_sources (user_id, encrypted_playlist_url, playlist_url_iv, playlist_url_auth_tag)
        VALUES (${user.id}, ${encrypted.encrypted}, ${encrypted.iv}, ${encrypted.authTag})
      `;
    } catch (error) {
      await sql`DELETE FROM users WHERE id = ${user.id}`.catch(() => undefined);
      throw error;
    }
    return NextResponse.json({ success: true, client: { id: user.id, username: user.username, displayName: user.display_name } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("users_username_key") || message.includes("duplicate key")) {
      return NextResponse.json({ error: "Este nome de usuário já está cadastrado." }, { status: 409 });
    }
    console.error("KageFlix client creation failed:", error);
    return NextResponse.json({ error: "Não foi possível cadastrar o cliente." }, { status: 500 });
  }
}
