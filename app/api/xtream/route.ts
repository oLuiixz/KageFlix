import { NextResponse } from "next/server";
import { getXtreamContext, safeKind, xtreamRequest } from "@/lib/xtream";

export const runtime = "nodejs";
export const maxDuration = 30;

const actions = {
  live: { categories: "get_live_categories", items: "get_live_streams" },
  vod: { categories: "get_vod_categories", items: "get_vod_streams" },
  series: { categories: "get_series_categories", items: "get_series" }
} as const;

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const kind = safeKind(params.get("type"));
    if (!kind) return NextResponse.json({ error: "Tipo de catálogo inválido." }, { status: 400 });
    const { username, password } = await getXtreamContext();
    const action = params.get("action") || "categories";

    if (action === "categories") {
      const data = await xtreamRequest<unknown>(username, password, actions[kind].categories);
      if (!Array.isArray(data)) throw new Error("O servidor não retornou categorias válidas.");
      const categories = data.map((item: any) => ({
        id: String(item.category_id ?? item.id ?? ""),
        name: String(item.category_name ?? item.name ?? "Sem categoria"),
        parentId: item.parent_id == null ? null : String(item.parent_id)
      })).filter(item => item.id);
      return NextResponse.json({ type: kind, categories }, { headers: { "Cache-Control": "private, no-store" } });
    }

    if (action === "items") {
      const categoryId = params.get("categoryId");
      if (!categoryId || !/^[-a-zA-Z0-9_]+$/.test(categoryId)) return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
      const data = await xtreamRequest<unknown>(username, password, actions[kind].items, { category_id: categoryId });
      if (!Array.isArray(data)) throw new Error("O servidor não retornou títulos válidos.");
      const items = data.map((item: any) => ({
        id: String(item.stream_id ?? item.series_id ?? item.id ?? ""),
        title: String(item.name ?? item.title ?? "Sem título"),
        poster: typeof (item.stream_icon ?? item.cover ?? item.movie_image) === "string" ? (item.stream_icon ?? item.cover ?? item.movie_image) : null,
        plot: typeof item.plot === "string" ? item.plot : "",
        year: item.year ?? item.releaseDate ?? null,
        rating: item.rating ?? null,
        extension: typeof item.container_extension === "string" ? item.container_extension : null,
        added: item.added ?? null
      })).filter(item => item.id);
      return NextResponse.json({ type: kind, categoryId, items }, { headers: { "Cache-Control": "private, no-store" } });
    }

    if (action === "series-info" && kind === "series") {
      const seriesId = params.get("seriesId");
      if (!seriesId || !/^\d+$/.test(seriesId)) return NextResponse.json({ error: "Série inválida." }, { status: 400 });
      const data = await xtreamRequest<any>(username, password, "get_series_info", { series_id: seriesId });
      const seasons = Array.isArray(data?.seasons) ? data.seasons : [];
      const episodes = data?.episodes && typeof data.episodes === "object" ? data.episodes : {};
      const normalized = Object.entries(episodes).flatMap(([season, list]: [string, any]) =>
        (Array.isArray(list) ? list : []).map((episode: any) => ({
          id: String(episode.id ?? ""),
          title: String(episode.title ?? episode.episode_num ?? "Episódio"),
          season: String(episode.season ?? season),
          episode: episode.episode_num ?? null,
          plot: episode.info?.plot ?? "",
          image: episode.info?.movie_image ?? episode.info?.cover_big ?? null,
          extension: typeof episode.container_extension === "string" ? episode.container_extension : "mp4"
        })).filter((episode: any) => /^\d+$/.test(episode.id))
      );
      return NextResponse.json({ info: data?.info ?? {}, seasons, episodes: normalized }, { headers: { "Cache-Control": "private, no-store" } });
    }

    return NextResponse.json({ error: "Ação não suportada." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao consultar catálogo IPTV.";
    const status = message.includes("Sessão") ? 401 : 502;
    console.error("KageFlix Xtream catalog error:", message);
    return NextResponse.json({ error: message }, { status });
  }
}
