"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Play, Search, Tv2, LoaderCircle, X, ChevronDown, Clapperboard, Radio } from "lucide-react";
import MobileNav from "@/components/mobile-nav";

type Kind = "live" | "vod" | "series";
type Item = { id: string; title: string; poster: string | null; plot: string; genre?: string; country?: string; year: string | number | null; rating: string | number | null; extension: string | null };
type Episode = { id: string; title: string; season: string; episode: number | null; plot: string; image: string | null; extension: string };
declare global { interface Window { mpegts?: any } }

export default function ExploreCategoryPage() {
  const params = useParams<{ type: string; categoryId: string }>();
  const kind = params.type as Kind;
  const categoryId = decodeURIComponent(params.categoryId);
  const [items, setItems] = useState<Item[]>([]);
  const [categoryName, setCategoryName] = useState("Catálogo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Item | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [seriesInfo, setSeriesInfo] = useState<any>(null);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [playing, setPlaying] = useState<{ id: string; extension: string; kind: "live" | "movie" | "series"; title: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mpegRef = useRef<any>(null);

  useEffect(() => {
    if (categoryId === "all-anime") setCategoryName("Todos os animes");
    else if (categoryId === "all-movies") setCategoryName("Todos os filmes");
    let alive = true;
    fetch(`/api/xtream?type=${kind}&action=items&categoryId=${encodeURIComponent(categoryId)}`, { cache: "no-store" })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Não foi possível carregar os títulos."); if (alive) setItems(data.items || []); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : "Falha ao carregar catálogo."); })
      .finally(() => { if (alive) setLoading(false); });
    if (categoryId !== "all-anime" && categoryId !== "all-movies") fetch(`/api/xtream?type=${kind}&action=categories`, { cache: "no-store" }).then(r => r.json()).then(data => { const match = (data.categories || []).find((entry: any) => String(entry.id) === categoryId); if (alive && match) setCategoryName(match.name); }).catch(() => {});
    return () => { alive = false; };
  }, [kind, categoryId]);

  useEffect(() => {
    if (!playing || !videoRef.current) return;
    const video = videoRef.current;
    const src = `/api/stream/${playing.kind}/${encodeURIComponent(playing.id)}?ext=${encodeURIComponent(playing.extension)}`;
    let active = true;
    const start = async () => {
      if (playing.kind === "live") {
        if (!window.mpegts) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/mpegts.js@latest/dist/mpegts.min.js";
            script.onload = () => resolve(); script.onerror = () => reject(new Error("Não foi possível carregar o mecanismo de TV ao vivo."));
            document.head.appendChild(script);
          });
        }
        if (!active) return;
        const engine = window.mpegts;
        if (engine?.isSupported()) {
          const player = engine.createPlayer({ type: "mpegts", url: src, isLive: true });
          mpegRef.current = player; player.attachMediaElement(video); player.load();
          try { await player.play(); } catch {}
          return;
        }
      }
      video.src = src;
      try { await video.play(); } catch {}
    };
    void start().catch(err => { if (active) setError(err instanceof Error ? err.message : "Falha ao iniciar reprodução."); });
    return () => { active = false; if (mpegRef.current) { mpegRef.current.destroy(); mpegRef.current = null; } video.pause(); video.removeAttribute("src"); video.load(); };
  }, [playing]);

  const animeItems = useMemo(() => {
    if (categoryId === "all-anime") return items;
    if (categoryId === "all-movies") return items;
    const category = categoryName.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLocaleLowerCase("pt-BR");
    const animeCategory = /anime|animes|crunchyroll|funimation/.test(category);
    return items.filter(item => {
      if (animeCategory) return true;
      const genre = (item.genre || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLocaleLowerCase("pt-BR");
      const country = (item.country || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLocaleLowerCase("pt-BR");
      return /\\banime\\b/.test(genre) || (/(animation|animacao)/.test(genre) && /(japan|japao|japanese|japones)/.test(country));
    });
  }, [items, categoryName, categoryId]);
  const filtered = useMemo(() => animeItems.filter(item => item.title.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))), [animeItems, search]);

  async function openItem(item: Item) {
    setSelected(item); setEpisodes([]); setSeriesInfo(null);
    if (kind === "series") {
      setLoadingEpisodes(true);
      try {
        const response = await fetch(`/api/xtream?type=series&action=series-info&seriesId=${encodeURIComponent(item.id)}`, { cache: "no-store" });
        const data = await response.json(); if (!response.ok) throw new Error(data.error || "Não foi possível carregar os episódios.");
        setEpisodes(data.episodes || []); setSeriesInfo(data.info || {});
      } catch (err) { setError(err instanceof Error ? err.message : "Falha ao carregar episódios."); }
      finally { setLoadingEpisodes(false); }
    } else {
      setPlaying({ id: item.id, extension: kind === "live" ? "ts" : item.extension || "mp4", kind: kind === "live" ? "live" : "movie", title: item.title });
    }
  }

  return <main className="kf-app min-h-screen">
    <header className="kf-header"><div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-12"><a href="/catalogo" className="kf-brand"><span className="kf-brand-mark"><Tv2 size={20}/></span><span>KAGE<span className="text-[#ed1722]">FLIX</span></span></a><a href="/iptv" className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white"><ArrowLeft size={15}/> Categorias</a></div></header>
    <section className="border-b border-white/[.07] bg-[#111] px-5 py-9 sm:px-8 lg:px-12"><div className="mx-auto max-w-[1500px]"><p className="kf-kicker mb-3">{kind === "live" ? "TV AO VIVO" : kind === "series" ? "SÉRIES" : "FILMES"}</p><h1 className="text-3xl font-black tracking-tight sm:text-4xl">{categoryName}</h1><p className="mt-2 text-sm text-zinc-400">{animeItems.length.toLocaleString("pt-BR")} {kind === "series" ? "animes" : "filmes"} nesta biblioteca</p><label className="relative mt-6 block max-w-[420px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/><input className="kf-control w-full pl-9 text-sm" placeholder="Buscar título..." value={search} onChange={e=>setSearch(e.target.value)}/></label></div></section>
    <section className="mx-auto max-w-[1500px] px-5 py-9 sm:px-8 lg:px-12">
      {loading ? <div className="kf-panel flex min-h-52 items-center justify-center gap-3 text-sm text-zinc-400"><LoaderCircle className="animate-spin text-red-500"/> Carregando títulos da biblioteca...</div> :
      error && !items.length ? <div role="alert" className="kf-panel border-red-500/20 p-6 text-sm text-red-200">{error}</div> :
      !filtered.length ? <div className="kf-empty py-16 text-center"><Tv2 className="mx-auto mb-3 text-zinc-600" size={28}/><p className="font-bold">Nenhum título encontrado</p></div> :
      <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">{filtered.map(item => <button key={item.id} onClick={() => void openItem(item)} className="kf-poster group text-left"><div className="kf-poster-art relative">{item.poster ? <img src={item.poster} alt="" loading="lazy"/> : <div className="flex h-full flex-col items-center justify-center px-3 text-center"><Tv2 className="mb-3 text-red-500/60" size={30}/><span className="line-clamp-4 text-xs font-bold text-zinc-400">{item.title}</span></div>}<span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100"><Play size={34} fill="currentColor"/></span></div><div className="min-h-[66px] p-3"><p className="line-clamp-2 text-xs font-bold leading-5 text-zinc-200">{item.title}</p>{item.year && <p className="mt-1 text-[10px] text-zinc-500">{item.year}</p>}</div></button>)}</div>}
    </section>
    {(playing || selected) && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/90 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true">
      <div className="my-auto w-full max-w-6xl overflow-hidden rounded-md border border-white/10 bg-[#111] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4"><div className="min-w-0"><p className="kf-kicker">{playing ? "REPRODUZINDO AGORA" : "DETALHES DA SÉRIE"}</p><h2 className="truncate text-base font-extrabold">{playing?.title || selected?.title}</h2></div><button onClick={() => { setPlaying(null); setSelected(null); setEpisodes([]); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-zinc-300 hover:bg-white/10" aria-label="Fechar"><X size={18}/></button></div>
        {playing ? <div className="bg-black"><video ref={videoRef} controls autoPlay playsInline className="aspect-video max-h-[72vh] w-full bg-black" poster={selected?.poster || undefined}/></div> :
        <div className="grid gap-5 p-5 md:grid-cols-[220px_1fr]"><div className="overflow-hidden rounded-xl bg-white/[.04]">{selected?.poster && <img src={selected.poster} alt="" className="aspect-[2/3] w-full object-cover"/>}</div><div className="min-w-0"><h3 className="text-xl font-black">{seriesInfo?.name || selected?.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{seriesInfo?.plot || selected?.plot || "Selecione um episódio para assistir."}</p><div className="mt-6 flex items-center justify-between"><h4 className="font-extrabold">Episódios</h4><span className="text-xs text-zinc-500">{episodes.length} disponíveis</span></div>{loadingEpisodes ? <div className="py-10 text-sm text-zinc-400"><LoaderCircle className="mr-2 inline animate-spin"/> Carregando episódios...</div> : <div className="mt-3 max-h-[48vh] space-y-2 overflow-y-auto pr-1">{episodes.map(episode => <button key={episode.id} onClick={() => { setSelected(null); setPlaying({ id: episode.id, extension: episode.extension || "mp4", kind: "series", title: episode.title }); }} className="flex w-full items-center gap-3 rounded-md border border-white/[.09] bg-[#181818] p-3 text-left transition hover:border-red-500/30 hover:bg-white/[.05]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-500/10 text-red-300"><Play size={15} fill="currentColor"/></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{episode.title}</span><span className="mt-1 block text-[10px] text-zinc-500">Temporada {episode.season}{episode.episode ? ` · Episódio ${episode.episode}` : ""}</span></span><ChevronDown size={15} className="rotate-[-90deg] text-zinc-600"/></button>)}</div>}</div></div>}
      </div>
    </div>}
    {error && items.length > 0 && <div className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-xl rounded-xl border border-red-500/20 bg-[#241014] p-3 text-xs text-red-200">{error}<button onClick={() => setError("")} className="ml-3 underline">Fechar</button></div>}
    <footer className="kf-footer px-5 py-7 text-center">© {new Date().getFullYear()} KAGEFLIX</footer>
      <MobileNav active="browse" />
</main>;
}
