import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { neon } from "@neondatabase/serverless";
import { encryptStreamUrl, parseM3U, sourceItemKey } from "@/lib/catalog";

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
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Apenas administradores podem importar o catálogo." }, { status: 403 });

  const playlistUrl = process.env.M3U_PLAYLIST_URL;
  if (!playlistUrl || !process.env.DATABASE_URL || !process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "Configure M3U_PLAYLIST_URL, DATABASE_URL e AUTH_SECRET nas variáveis da Vercel." }, { status: 503 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(playlistUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") throw new Error("Invalid protocol");
  } catch {
    return NextResponse.json({ error: "M3U_PLAYLIST_URL precisa ser uma URL HTTP ou HTTPS válida." }, { status: 500 });
  }

  const sql = neon(process.env.DATABASE_URL);
  let runId: string | null = null;
  let importedCount = 0;
  let skippedCount = 0;

  try {
    const [run] = await sql`
      INSERT INTO catalog_import_runs (source_name, status)
      VALUES ('M3U', 'running')
      RETURNING id
    `;
    runId = String(run.id);

    const response = await fetch(parsedUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
      headers: { Accept: "audio/x-mpegurl, application/vnd.apple.mpegurl, text/plain, */*" }
    });
    if (!response.ok) throw new Error(`A origem M3U respondeu HTTP ${response.status}.`);

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_PLAYLIST_CHARS) throw new Error("Playlist excede o limite de 15 MB.");

    const playlist = await response.text();
    if (playlist.length > MAX_PLAYLIST_CHARS) throw new Error("Playlist excede o limite de 15 MB.");
    if (!playlist.trimStart().startsWith("#EXTM3U")) throw new Error("A resposta recebida não parece ser uma playlist M3U válida.");

    const items = parseM3U(playlist);
    if (items.length > MAX_ITEMS) throw new Error("A playlist contém mais de 5.000 itens nas categorias selecionadas.");
    if (!items.length) throw new Error("Nenhum item encontrado nos grupos Crunchyroll e Funimation Now.");

    const categories = await sql`SELECT id, name FROM catalog_categories WHERE name IN ('Crunchyroll', 'Funimation Now')`;
    const categoryIds = new Map(categories.map((category) => [String(category.name), String(category.id)]));
    if (!categoryIds.has("Crunchyroll") || !categoryIds.has("Funimation Now")) {
      throw new Error("As categorias iniciais não foram encontradas no banco.");
    }

    for (const item of items) {
      const categoryId = categoryIds.get(item.groupTitle);
      if (!categoryId) { skippedCount++; continue; }
      const encrypted = encryptStreamUrl(item.streamUrl);
      await sql`
        INSERT INTO catalog_items (
          category_id, title, encrypted_stream_url, stream_url_iv, stream_url_auth_tag,
          logo_url, tvg_id, tvg_name, source_item_key, group_title, media_type, metadata,
          is_available, updated_at
        ) VALUES (
          ${categoryId}, ${item.title}, ${encrypted.encrypted}, ${encrypted.iv}, ${encrypted.authTag},
          ${item.logoUrl}, ${item.tvgId}, ${item.tvgName}, ${sourceItemKey(item.streamUrl)},
          ${item.groupTitle}, 'series', ${JSON.stringify({ source: "m3u" })}::jsonb, TRUE, NOW()
        )
        ON CONFLICT (category_id, source_item_key) DO UPDATE SET
          title = EXCLUDED.title,
          encrypted_stream_url = EXCLUDED.encrypted_stream_url,
          stream_url_iv = EXCLUDED.stream_url_iv,
          stream_url_auth_tag = EXCLUDED.stream_url_auth_tag,
          logo_url = EXCLUDED.logo_url,
          tvg_id = EXCLUDED.tvg_id,
          tvg_name = EXCLUDED.tvg_name,
          group_title = EXCLUDED.group_title,
          media_type = 'series',
          is_available = TRUE,
          updated_at = NOW()
      `;
      importedCount++;
    }

    await sql`
      UPDATE catalog_import_runs
      SET status = 'completed', imported_count = ${importedCount},
          skipped_count = ${skippedCount}, finished_at = NOW()
      WHERE id = ${runId}
    `;

    return NextResponse.json({
      success: true,
      imported: importedCount,
      skipped: skippedCount,
      message: "Importação das categorias selecionadas concluída."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada na importação.";
    if (runId) {
      await sql`
        UPDATE catalog_import_runs
        SET status = 'failed', imported_count = ${importedCount},
            skipped_count = ${skippedCount}, error_message = ${message.slice(0, 500)},
            finished_at = NOW()
        WHERE id = ${runId}
      `.catch(() => undefined);
    }
    console.error("KageFlix M3U import failed:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
