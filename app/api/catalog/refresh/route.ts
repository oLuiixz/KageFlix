import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { neon } from "@neondatabase/serverless";
import { decryptPrivateValue, encryptStreamUrl, parseM3U, sourceItemKey } from "@/lib/catalog";

export const runtime = "nodejs";
export const maxDuration = 60;
const COOKIE = "kageflix_session";
const MAX_PLAYLIST_CHARS = 15 * 1024 * 1024;
const MAX_ITEMS = 5000;

export async function POST() {
  const secret = process.env.AUTH_SECRET;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!secret || !token || !process.env.DATABASE_URL) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  let userId: string;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    if (payload.role !== "member" || typeof payload.sub !== "string") return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    userId = payload.sub;
  } catch { return NextResponse.json({ error: "Sessão inválida." }, { status: 401 }); }

  const sql = neon(process.env.DATABASE_URL);
  try {
    const rows = await sql`
      SELECT s.encrypted_playlist_url, s.playlist_url_iv, s.playlist_url_auth_tag
      FROM user_iptv_sources s JOIN users u ON u.id = s.user_id
      WHERE s.user_id = ${userId} AND u.role = 'member' AND u.is_active = TRUE LIMIT 1
    `;
    const source = rows[0];
    if (!source) return NextResponse.json({ error: "Sua lista ainda não está conectada." }, { status: 404 });
    const playlistUrl = decryptPrivateValue(Buffer.from(source.encrypted_playlist_url), Buffer.from(source.playlist_url_iv), Buffer.from(source.playlist_url_auth_tag), "user-iptv-playlist-url");
    const response = await fetch(playlistUrl, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(30000), headers: { Accept: "audio/x-mpegurl, application/vnd.apple.mpegurl, text/plain, */*" } });
    if (!response.ok) throw new Error("O servidor da lista respondeu com erro HTTP " + response.status + ".");
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_PLAYLIST_CHARS) throw new Error("A lista excede o limite de 15 MB.");
    const playlist = await response.text();
    if (playlist.length > MAX_PLAYLIST_CHARS) throw new Error("A lista excede o limite de 15 MB.");
    if (!playlist.trimStart().startsWith("#EXTM3U")) throw new Error("O servidor não retornou uma lista M3U válida.");
    const items = parseM3U(playlist);
    if (!items.length) {
      const groups = [...new Set(Array.from(playlist.matchAll(/group-title="([^"]*)"/gi), m => m[1].trim()).filter(Boolean))].slice(0, 15);
      throw new Error(groups.length ? "Nenhum título das categorias configuradas foi encontrado. Grupos recebidos: " + groups.join(" | ") : "A lista não trouxe grupos reconhecíveis.");
    }
    if (items.length > MAX_ITEMS) throw new Error("A lista excede o limite de 5.000 títulos.");
    const categories = await sql`SELECT id, name FROM catalog_categories WHERE name IN ('Crunchyroll', 'Funimation Now')`;
    const ids = new Map(categories.map(c => [String(c.name), String(c.id)]));
    let imported = 0;
    for (const item of items) {
      const categoryId = ids.get(item.groupTitle);
      if (!categoryId) continue;
      const encrypted = encryptStreamUrl(item.streamUrl);
      await sql`
        INSERT INTO user_catalog_items (
          user_id, category_id, title, encrypted_stream_url, stream_url_iv, stream_url_auth_tag,
          logo_url, tvg_id, tvg_name, source_item_key, group_title, media_type, metadata, is_available, updated_at
        ) VALUES (
          ${userId}, ${categoryId}, ${item.title}, ${encrypted.encrypted}, ${encrypted.iv}, ${encrypted.authTag},
          ${item.logoUrl}, ${item.tvgId}, ${item.tvgName}, ${sourceItemKey(item.streamUrl)},
          ${item.groupTitle}, 'series', ${JSON.stringify({ source: "m3u", refreshedAt: new Date().toISOString() })}::jsonb, TRUE, NOW()
        )
        ON CONFLICT (user_id, category_id, source_item_key) DO UPDATE SET
          title = EXCLUDED.title, encrypted_stream_url = EXCLUDED.encrypted_stream_url,
          stream_url_iv = EXCLUDED.stream_url_iv, stream_url_auth_tag = EXCLUDED.stream_url_auth_tag,
          logo_url = EXCLUDED.logo_url, tvg_id = EXCLUDED.tvg_id, tvg_name = EXCLUDED.tvg_name,
          group_title = EXCLUDED.group_title, is_available = TRUE, updated_at = NOW()
      `;
      imported++;
    }
    if (!imported) throw new Error("Nenhum título pôde ser atualizado nas categorias disponíveis.");
    const counts = await sql`SELECT COUNT(*)::int AS total FROM user_catalog_items WHERE user_id = ${userId} AND is_available = TRUE`;
    return NextResponse.json({ success: true, imported, total: Number(counts[0]?.total || 0), refreshedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar a lista.";
    console.error("KageFlix subscriber refresh failed:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
