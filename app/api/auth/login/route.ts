import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { SignJWT } from "jose";
import { encryptPrivateValue, encryptStreamUrl, parseM3U, sourceItemKey, validatePlaylistUrl } from "@/lib/catalog";

export const runtime = "nodejs";
export const maxDuration = 60;
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

async function syncSubscriberCatalog(sql: ReturnType<typeof neon>, userId: string, playlistUrl: string) {
  const parsedUrl = validatePlaylistUrl(playlistUrl);
  if (!parsedUrl) throw new Error("URL M3U individual inválida.");

  const response = await fetch(parsedUrl, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(25000),
    headers: { Accept: "audio/x-mpegurl, application/vnd.apple.mpegurl, text/plain, */*" }
  });
  if (!response.ok) throw new Error(`A playlist respondeu HTTP ${response.status}.`);

  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > 15 * 1024 * 1024) throw new Error("Playlist excede 15 MB.");
  const playlist = await response.text();
  if (playlist.length > 15 * 1024 * 1024) throw new Error("Playlist excede 15 MB.");
  if (!playlist.trimStart().startsWith("#EXTM3U")) throw new Error("Resposta M3U inválida.");

  const items = parseM3U(playlist);
  if (!items.length) throw new Error("A playlist não contém itens nos grupos Crunchyroll ou Funimation Now.");
  if (items.length > 5000) throw new Error("Playlist excede o limite de 5.000 itens.");

  const categories = await sql`SELECT id, name FROM catalog_categories WHERE name IN ('Crunchyroll', 'Funimation Now')`;
  const categoryIds = new Map(categories.map((category: { id: string; name: string }) => [category.name, category.id]));
  if (!categoryIds.has("Crunchyroll") || !categoryIds.has("Funimation Now")) {
    throw new Error("Categorias iniciais não encontradas.");
  }

  let imported = 0;
  for (const item of items) {
    const categoryId = categoryIds.get(item.groupTitle);
    if (!categoryId) continue;
    const encryptedStream = encryptStreamUrl(item.streamUrl);
    await sql`
      INSERT INTO user_catalog_items (
        user_id, category_id, title, encrypted_stream_url, stream_url_iv, stream_url_auth_tag,
        logo_url, tvg_id, tvg_name, source_item_key, group_title, media_type, metadata,
        is_available, updated_at
      ) VALUES (
        ${userId}, ${categoryId}, ${item.title}, ${encryptedStream.encrypted}, ${encryptedStream.iv}, ${encryptedStream.authTag},
        ${item.logoUrl}, ${item.tvgId}, ${item.tvgName}, ${sourceItemKey(item.streamUrl)},
        ${item.groupTitle}, 'series', ${JSON.stringify({ source: "m3u" })}::jsonb, TRUE, NOW()
      )
      ON CONFLICT (user_id, category_id, source_item_key) DO UPDATE SET
        title = EXCLUDED.title, encrypted_stream_url = EXCLUDED.encrypted_stream_url,
        stream_url_iv = EXCLUDED.stream_url_iv, stream_url_auth_tag = EXCLUDED.stream_url_auth_tag,
        logo_url = EXCLUDED.logo_url, tvg_id = EXCLUDED.tvg_id, tvg_name = EXCLUDED.tvg_name,
        group_title = EXCLUDED.group_title, media_type = 'series', is_available = TRUE, updated_at = NOW()
    `;
    imported++;
  }
  return imported;
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
    type AuthUser = {
      id: string;
      username: string;
      display_name: string;
      role: "admin" | "member";
      is_active: boolean;
    };
    let user: AuthUser | undefined = rows[0] as AuthUser | undefined;

    if (!user) {
      try {
        const created = await sql`
          INSERT INTO users (username, password_hash, display_name, role, is_active)
          VALUES (${username.trim()}, NULL, ${username.trim()}, 'member', TRUE)
          RETURNING id, username, display_name, role, is_active
        `;
        user = created[0] as AuthUser | undefined;
      } catch (error) {
        // A simultaneous first login may have inserted the same username.
        const retry = await sql`
          SELECT id, username, display_name, role, is_active
          FROM users
          WHERE LOWER(username) = LOWER(${username.trim()})
          LIMIT 1
        `;
        user = retry[0] as AuthUser | undefined;
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

    // Download the subscriber's playlist only on the first successful setup.
    // Once catalog items exist, future logins reuse the saved per-user catalog.
    const existingCatalog = await sql`
      SELECT COUNT(*)::int AS total
      FROM user_catalog_items
      WHERE user_id = ${user.id} AND is_available = TRUE
    `;
    const hasCatalog = Number(existingCatalog[0]?.total || 0) > 0;
    let catalogSync: { status: "downloaded" | "already_ready"; imported?: number } = {
      status: "already_ready"
    };

    if (!hasCatalog) {
      try {
        const imported = await syncSubscriberCatalog(sql, user.id, playlistUrl);
        catalogSync = { status: "downloaded", imported };
        if (imported === 0) throw new Error("Nenhum título válido foi encontrado nas categorias selecionadas.");
      } catch (syncError) {
        const reason = syncError instanceof Error ? syncError.message : "Falha desconhecida";
        console.error("KageFlix first catalog download failed:", reason);
        return NextResponse.json({
          error: "Seu acesso foi validado, mas não conseguimos baixar sua lista agora. Tente entrar novamente em instantes."
        }, { status: 502 });
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

    const response = NextResponse.json({ success: true, catalogSync });
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
