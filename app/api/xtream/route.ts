import { NextResponse } from "next/server";
import { getXtreamContext, safeKind, xtreamRequest } from "@/lib/xtream";
import { filterAnimeItems } from "@/lib/anime-matcher";

export const runtime = "nodejs";
export const maxDuration = 60;

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
        name: String(item.category_name ?? item.name ?? "Sem categoria").replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "").replace(/^\s*[|·•-]+\s*|\s*[|·•-]+\s*$/g, "").trim() || "Sem categoria",
        parentId: item.parent_id == null ? null : String(item.parent_id)
      })).filter(item => item.id);
      return NextResponse.json({ type: kind, categories }, { headers: { "Cache-Control": "private, no-store" } });
    }

    if (action === "categories") {
      const data = await xtreamRequest<unknown>(username, password, actions[kind].categories);
      if (!Array.isArray(data)) throw new Error("O servidor não retornou categorias válidas.");
      const categories = data.map((item: any) => ({
        id: String(item.category_id ?? item.id ?? ""),
        name: String(item.category_name ?? item.name ?? "Sem categoria").replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "").replace(/^\s*[|·•-]+\s*|\s*[|·•-]+\s*$/g, "").trim() || "Sem categoria",
        parentId: item.parent_id == null ? null : String(item.parent_id)
      })).filter(item => item.id);
      return NextResponse.json({ type: kind, categories }, { headers: { "Cache-Control": "private, no-store" } });
    }

    if (action === "anime-categories" && (kind === "vod" || kind === "series")) {
      const data = await xtreamRequest<any[]>(username, password, actions[kind].categories);
      if (!Array.isArray(data)) throw new Error("O servidor não retornou categorias válidas.");
      const categories = data.map((item: any) => ({
        id: String(item.category_id ?? item.id ?? ""),
        name: String(item.category_name ?? item.name ?? "Sem categoria").replace(/[\\p{Extended_Pictographic}\\uFE0F]/gu, "").replace(/^\\s*[|·•-]+\\s*|\\s*[|·•-]+\\s*$/g, "").trim() || "Sem categoria",
        parentId: item.parent_id == null ? null : String(item.parent_id)
      })).filter(item => item.id);
      const scanned: Array<{ category: (typeof categories)[number]; animeCount: number }> = [];
      let cursor = 0;
      const worker = async () => {
        while (cursor < categories.length) {
          const index = cursor++;
          const category = categories[index];
          try {
            const list = await xtreamRequest<any[]>(username, password, actions[kind].items, { category_id: category.id });
            const candidates = (Array.isArray(list) ? list : []).map((entry: any) => ({
              title: String(entry.name ?? entry.title ?? ""),
              genre: typeof entry.genre === "string" ? entry.genre : "",
              country: typeof entry.country === "string" ? entry.country : typeof entry.country_name === "string" ? entry.country_name : ""
            }));
            const anime = await filterAnimeItems(candidates);
            if (anime.length) scanned.push({ category, animeCount: anime.length });
          } catch (error) {
            console.warn("KageFlix category scan skipped:", category.name, error);
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(8, categories.length) }, () => worker()));
      const ordered = scanned.sort((left, right) => left.category.name.localeCompare(right.category.name, "pt-BR"));
      return NextResponse.json({ type: kind, categories: ordered.map(entry => ({ ...entry.category, animeCount: entry.animeCount })) }, { headers: { "Cache-Control": "private, no-store" } });
    }

    if (action === "search" && kind === "series") {
      const query = (params.get("query") || "").trim();
      if (query.length < 2 || query.length > 100) return NextResponse.json({ error: "Busca inválida." }, { status: 400 });
      const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();
      const wanted = normalize(query);
      const categoryData = await xtreamRequest<any[]>(username, password, actions.series.categories);
      const categories = Array.isArray(categoryData) ? categoryData : [];
      const lists: any[][] = [];
      for (let offset = 0; offset < categories.length; offset += 4) {
        const batch = await Promise.all(categories.slice(offset, offset + 4).map(async (category: any) => {
          const categoryId = String(category.category_id ?? category.id ?? "");
          if (!categoryId) return [];
          const data = await xtreamRequest<any[]>(username, password, actions.series.items, { category_id: categoryId });
          return (Array.isArray(data) ? data : []).map((entry: any) => ({
            id: String(entry.series_id ?? entry.stream_id ?? entry.id ?? ""),
            title: String(entry.name ?? entry.title ?? ""),
            poster: typeof (entry.cover ?? entry.stream_icon) === "string" ? (entry.cover ?? entry.stream_icon) : null,
            plot: typeof entry.plot === "string" ? entry.plot : "",
            categoryId,
            categoryName: String(category.category_name ?? category.name ?? "")
          })).filter((entry: any) => /^\d+$/.test(entry.id));
        }));
        lists.push(...batch);
        if (batch.flat().some((entry: any) => normalize(entry.title) === wanted)) break;
      }
      const matches = lists.flat().filter((entry: any) => normalize(entry.title).includes(wanted));
      matches.sort((left: any, right: any) => Number(normalize(right.title) === wanted) - Number(normalize(left.title) === wanted));
      if (!matches.length) return NextResponse.json({ error: "Este título não foi encontrado nas séries disponíveis." }, { status: 404 });
      return NextResponse.json({ item: matches[0] }, { headers: { "Cache-Control": "private, no-store" } });
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
        genre: typeof item.genre === "string" ? item.genre : "",
        country: typeof item.country === "string" ? item.country : typeof item.country_name === "string" ? item.country_name : "",
        year: item.year ?? item.releaseDate ?? null,
        rating: item.rating ?? null,
        extension: typeof item.container_extension === "string" ? item.container_extension : null,
        added: item.added ?? null
      })).filter(item => item.id);
      const animeItems = await filterAnimeItems(items);
      return NextResponse.json({ type: kind, categoryId, items: animeItems, totalItems: items.length, animeCount: animeItems.length }, { headers: { "Cache-Control": "private, no-store" } });
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
    const message = error instanceof Error ? error.message.replace(/Xtream|IPTV/gi, "catálogo") : "Falha ao consultar o catálogo.";
    const status = message.includes("Sessão") ? 401 : 502;
    console.error("KageFlix Xtream catalog error:", message);
    return NextResponse.json({ error: message }, { status });
  }
}
