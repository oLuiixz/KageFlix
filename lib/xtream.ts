import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { neon } from "@neondatabase/serverless";
import { decryptPrivateValue } from "@/lib/catalog";

export type XtreamKind = "live" | "vod" | "series";
const COOKIE = "kageflix_session";
const HOST = "xmrs2.top";

export async function getXtreamContext() {
  const secret = process.env.AUTH_SECRET;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!secret || !token || !process.env.DATABASE_URL) throw new Error("Sessão não autenticada.");
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
  if (typeof payload.sub !== "string" || !["member", "admin"].includes(String(payload.role))) throw new Error("Sessão inválida.");
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    SELECT s.encrypted_playlist_url, s.playlist_url_iv, s.playlist_url_auth_tag
    FROM user_iptv_sources s JOIN users u ON u.id = s.user_id
    WHERE s.user_id = ${payload.sub} AND u.is_active = TRUE LIMIT 1
  `;
  const source = rows[0];
  if (!source) throw new Error("Sua lista ainda não está conectada.");
  const savedUrl = decryptPrivateValue(Buffer.from(source.encrypted_playlist_url), Buffer.from(source.playlist_url_iv), Buffer.from(source.playlist_url_auth_tag), "user-iptv-playlist-url");
  const parsed = new URL(savedUrl);
  if (parsed.protocol !== "http:" || parsed.hostname !== HOST) throw new Error("Origem IPTV não permitida.");
  const username = parsed.searchParams.get("username");
  const password = parsed.searchParams.get("password");
  if (!username || !password) throw new Error("Credenciais IPTV não encontradas.");
  return { username, password, userId: payload.sub };
}

export async function xtreamRequest<T = unknown>(username: string, password: string, action?: string, extra: Record<string, string> = {}): Promise<T> {
  const url = new URL("/player_api.php", `http://${HOST}`);
  url.searchParams.set("username", username);
  url.searchParams.set("password", password);
  if (action) url.searchParams.set("action", action);
  for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, value);
  const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(25000), headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Servidor IPTV respondeu HTTP ${response.status}.`);
  const data = await response.json() as T;
  if (data && typeof data === "object" && "user_info" in data) {
    const info = (data as { user_info?: { auth?: number | string; status?: string } }).user_info;
    if (info && info.auth !== 1 && info.auth !== "1") throw new Error("Acesso IPTV não autorizado.");
    if (info?.status && !["active", "enabled", "1"].includes(info.status.toLowerCase())) throw new Error("Assinatura IPTV inativa.");
  }
  return data;
}

export function safeKind(value: string | null): XtreamKind | null {
  return value === "live" || value === "vod" || value === "series" ? value : null;
}
