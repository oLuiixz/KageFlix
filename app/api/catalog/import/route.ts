import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { neon } from "@neondatabase/serverless";
import { decryptPrivateValue, encryptStreamUrl, parseM3U, sourceItemKey } from "@/lib/catalog";

export const runtime = "nodejs";
export const maxDuration = 60;
const COOKIE = "kageflix_session";
const MAX_PLAYLIST_CHARS = 15 * 1024 * 1024;
const MAX_ITEMS = 5000;

async function isAdmin() {
  const secret = process.env.AUTH_SECRET;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!secret || !token) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return payload.role === "admin" && typeof payload.sub === "string";
  } catch { return false; }
}

export async function POST(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) return NextResponse.json({ error: "Apenas administradores podem importar catálogos." }, { status: 403 });
  if (!process.env.DATABASE_URL || !process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "O servidor ainda não está configurado." }, { status: 503 });
  }

  let body: { userId?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 }); }
  if (typeof body.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.userId)) {
    return NextResponse.json({ error: "Selecione um cliente válido." }, { status: 400 });
  }

  const sql = neon(process.env.DATABASE_URL);
  let importedCount = 0;
  try {
    const rows = await sql`
      SELECT s.encrypted_playlist_url, s.playlist_url_iv, s.playlist_url_auth_tag
      FROM user_iptv_sources s
      JOIN users u ON u.id = s.user_id
      WHERE s.user_id = ${body.userId} AND u.role = 'member' AND u.is_active = TRUE
      LIMIT 1
    `;
    const source = rows[0];
    if (!source) return NextResponse.json({ error: "Este cliente ainda não possui uma M3U cadastrada." }, { status: 404 });

    const playlistUrl = decryptPrivateValue(
      Buffer.from(source.encrypted_playlist_url), Buffer.from(source.playlist_url_iv),
      Buffer.from(source.playlist_url_auth_tag), "user-iptv-playlist-url"
    );
    const parsedUrl = new URL(playlistUrl);
    const response = await fetch(parsedUrl, {
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(30000),
      headers: { Accept: "audio/x-mpegurl, application/vnd.apple.mpegurl, text/plain, */*" }
    });
    if (!response.ok) throw new Error(`A origem M3U respondeu HTTP ${response.status}.`);
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_PLAYLIST_CHARS) throw new Error("Playlist excede o limite de 15 MB.");
    const playlist = await response.text();
    if (playlist.length > MAX_PLAYLIST_CHARS) throw new Error("Playlist excede o limite de 15 MB.");
    if (!playlist.trimStart().startsWith("#EXTM3U")) throw new Error("A resposta não parece ser uma playlist M3U válida.");

    const items = parseM3U(playlist);
    if (items.length > MAX_ITEMS) throw new Error("A playlist excede o limite de 5.000 itens selecionados.");
    if (!items.length) {
      const groups = [...new Set(Array.from(playlist.matchAll(/group-title="([^"]*)"/gi), (match) => match[1].trim()).filter(Boolean))].slice(0, 20);
      const groupHint = groups.length ? ` Grupos encontrados: ${groups.join(" | ")}.` : " A playlist não contém atributos group-title reconhecíveis.";
      throw new Error("Nenhum item foi identificado nas categorias selecionadas." + groupHint);
    }

    const categories = await sql`SELECT id, name FROM catalog_categories WHERE name IN ('Crunchyroll', 'Funimation Now')`;
    const categoryIds = new Map(categories.map((category) => [String(category.name), String(category.id)]));
    if (!categoryIds.has("Crunchyroll") || !categoryIds.has("Funimation Now")) {
      throw new Error("As categorias iniciais não foram encontradas no banco.");
    }

    for (const item of items) {
      const categoryId = categoryIds.get(item.groupTitle);
      if (!categoryId) continue;
      const encrypted = encryptStreamUrl(item.streamUrl);
      await sql`
        INSERT INTO user_catalog_items (
          user_id, category_id, title, encrypted_stream_url, stream_url_iv, stream_url_auth_tag,
          logo_url, tvg_id, tvg_name, source_item_key, group_title, media_type, metadata,
          is_available, updated_at
        ) VALUES (
          ${body.userId}, ${categoryId}, ${item.title}, ${encrypted.encrypted}, ${encrypted.iv}, ${encrypted.authTag},
          ${item.logoUrl}, ${item.tvgId}, ${item.tvgName}, ${sourceItemKey(item.streamUrl)},
          ${item.groupTitle}, 'series', ${JSON.stringify({ source: "m3u" })}::jsonb, TRUE, NOW()
        )
        ON CONFLICT (user_id, category_id, source_item_key) DO UPDATE SET
          title = EXCLUDED.title, encrypted_stream_url = EXCLUDED.encrypted_stream_url,
          stream_url_iv = EXCLUDED.stream_url_iv, stream_url_auth_tag = EXCLUDED.stream_url_auth_tag,
          logo_url = EXCLUDED.logo_url, tvg_id = EXCLUDED.tvg_id, tvg_name = EXCLUDED.tvg_name,
          group_title = EXCLUDED.group_title, media_type = 'series', is_available = TRUE, updated_at = NOW()
      `;
      importedCount++;
    }
    return NextResponse.json({ success: true, imported: importedCount, message: "Catálogo individual sincronizado." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada na importação.";
    console.error("KageFlix per-user M3U import failed:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
