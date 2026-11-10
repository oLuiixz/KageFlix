import { NextResponse } from "next/server";
import { getXtreamContext, xtreamRequest } from "@/lib/xtream";

export const runtime = "nodejs";
export const maxDuration = 30;

// "Atualizar lista" only verifies the upstream connection. Catalog data is fetched
// on demand from Xtream and is never imported into Neon.
export async function POST() {
  try {
    const { username, password } = await getXtreamContext();
    const [live, vod, series] = await Promise.all([
      xtreamRequest<unknown>(username, password, "get_live_categories"),
      xtreamRequest<unknown>(username, password, "get_vod_categories"),
      xtreamRequest<unknown>(username, password, "get_series_categories")
    ]);
    const count = (value: unknown) => Array.isArray(value) ? value.length : 0;
    return NextResponse.json({
      success: true,
      mode: "on-demand",
      categories: { live: count(live), vod: count(vod), series: count(series) },
      message: "Conexão verificada. O catálogo será carregado sob demanda, sem salvar títulos no banco."
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível atualizar a conexão.";
    console.error("KageFlix Xtream connection check failed:", message);
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : 502 });
  }
}
