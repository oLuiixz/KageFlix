import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
const COOKIE = "kageflix_session";

async function getSession() {
  const secret = process.env.AUTH_SECRET;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!secret || !token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? { userId: payload.sub, role: payload.role === "admin" ? "admin" : "member" } : null;
  } catch { return null; }
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Banco de dados não configurado." }, { status: 503 });
  try {
    const sql = neon(process.env.DATABASE_URL);
    const requestedCategory = new URL(request.url).searchParams.get("category");
    if (requestedCategory) {
      const categoryName = requestedCategory === "crunchyroll" ? "Crunchyroll"
        : requestedCategory === "funimation-now" ? "Funimation Now" : null;
      if (!categoryName) return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
      const categoryRows = await sql`
        SELECT id, name FROM catalog_categories WHERE name = ${categoryName} LIMIT 1
      `;
      if (!categoryRows.length) return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
      const items = await sql`
        SELECT id, title, logo_url, tvg_name
        FROM user_catalog_items
        WHERE user_id = ${session.userId}
          AND category_id = ${categoryRows[0].id}
          AND is_available = TRUE
        ORDER BY title ASC
      `;
      return NextResponse.json({
        category: categoryName,
        items: items.map((item) => ({ id: item.id, title: item.title, logoUrl: item.logo_url, tvgName: item.tvg_name }))
      }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const rows = await sql`
      SELECT c.id, c.name, c.media_type, c.is_enabled,
             COUNT(i.id)::int AS item_count
      FROM catalog_categories c
      LEFT JOIN user_catalog_items i
        ON i.category_id = c.id AND i.user_id = ${session.userId} AND i.is_available = TRUE
      WHERE c.name IN ('Crunchyroll', 'Funimation Now')
      GROUP BY c.id
      ORDER BY CASE c.name WHEN 'Crunchyroll' THEN 1 ELSE 2 END
    `;
    return NextResponse.json({
      categories: rows.map((row) => ({
        id: row.id, name: row.name, mediaType: row.media_type,
        enabled: row.is_enabled, count: Number(row.item_count || 0)
      })),
      canImport: session.role === "admin"
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("KageFlix catalog read failed:", error);
    return NextResponse.json({ error: "Não foi possível carregar o catálogo." }, { status: 500 });
  }
}
