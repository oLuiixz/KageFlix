"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Play, Tv2, X, Star, CalendarDays, Clapperboard } from "lucide-react";
import ContentLoader from "@/components/content-loader";
import MobileNav from "@/components/mobile-nav";

type Featured = { slug: string; title: string; query: string; fallback: string; eyebrow: string };
type AnimeItem = { id: string; title: string; poster: string | null; plot: string; categoryId: string; categoryName: string };
type Episode = { id: string; title: string; season: string; episode: number | null; plot: string; image: string | null; extension: string };

const featured: Featured[] = [
  { slug: "demon-slayer", title: "Demon Slayer", query: "Demon Slayer", fallback: "https://img.anime2you.de/2021/07/demon-slayer-s2-visual.jpg", eyebrow: "AÇÃO • FANTASIA" },
  { slug: "jujutsu-kaisen", title: "Jujutsu Kaisen", query: "Jujutsu Kaisen", fallback: "https://as01.epimg.net/meristation/imagenes/2022/08/22/noticias/1661161775_656366_1661164198_noticia_normal.jpg", eyebrow: "SOBRENATURAL" },
  { slug: "one-piece", title: "One Piece", query: "One Piece", fallback: "https://cdn.myanimelist.net/images/anime/6/73245.jpg", eyebrow: "AVENTURA" },
  { slug: "my-hero-academia", title: "My Hero Academia", query: "My Hero Academia", fallback: "https://es.web.img2.acsta.net/pictures/23/04/06/09/18/0802333.jpg", eyebrow: "AÇÃO • HERÓIS" }
];

declare global { interface Window { mpegts?: any } }

export default function AnimeDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const config = featured.find(item => item.slug === slug);
  const [item, setItem] = useState<AnimeItem | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<Episode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mpegRef = useRef<any>(null);

  useEffect(() => {
    let alive = true;
    if (!config) { setError("Conteúdo não encontrado."); setLoading(false); return; }
    setLoading(true); setError("");
    fetch(`/api/xtream?type=series&action=search&query=${encodeURIComponent(config.query)}`, { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível localizar este anime na sua lista.");
        if (!alive) return;
        setItem(data.item);
        return fetch(`/api/xtream?type=series&action=series-info&seriesId=${encodeURIComponent(data.item.id)}`, { cache: "no-store" });
      })
      .then(async response => {
        if (!response) return;
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível carregar os episódios.");
        if (alive) { setInfo(data.info || {}); setEpisodes(data.episodes || []); }
      })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : "Falha ao carregar o conteúdo."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [config]);

  useEffect(() => {
    if (!playing || !videoRef.current) return;
    const video = videoRef.current;
    const src = `/api/stream/series/${encodeURIComponent(playing.id)}?ext=${encodeURIComponent(playing.extension || "mp4")}`;
    let active = true;
    video.src = src;
    void video.play().catch(() => {});
    return () => {
      active = false;
      if (mpegRef.current) { mpegRef.current.destroy(); mpegRef.current = null; }
      video.pause(); video.removeAttribute("src"); video.load();
    };
  }, [playing]);

  const groupedEpisodes = useMemo(() => {
    const groups = new Map<string, Episode[]>();
    for (const episode of episodes) {
      const list = groups.get(episode.season) || [];
      list.push(episode); groups.set(episode.season, list);
    }
    return [...groups.entries()].sort((a,b) => Number(a[0])-Number(b[0]));
  }, [episodes]);

  if (!config) return <main className="kf-app min-h-screen p-10 text-white">Conteúdo não encontrado. <a className="text-red-400 underline" href="/inicio">Voltar</a></main>;

  const poster = item?.poster || config.fallback;
  const description = info?.plot || item?.plot || "Acompanhe esta história e descubra todos os episódios disponíveis na sua coleção.";
  const year = info?.releaseDate || info?.year || "";

  return <main className="kf-app min-h-screen">
    <header className="kf-header relative z-10"><div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-12"><a href="/inicio" className="kf-brand"><span className="kf-brand-mark"><Tv2 size={20}/></span><span>KAGE<span className="text-[#ed1722]">FLIX</span></span></a><a href="/catalogo?type=series" className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white"><ArrowLeft size={15}/> Séries</a></div></header>

    <section className="relative isolate min-h-[570px] overflow-hidden border-b border-white/[.06] sm:min-h-[650px]">
      <img src={poster} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-65 blur-[1px] scale-105"/>
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,5,7,.98)_0%,rgba(5,5,7,.84)_40%,rgba(5,5,7,.22)_100%),linear-gradient(0deg,#090909_0%,transparent_70%)]"/>
      <div className="mx-auto flex min-h-[570px] max-w-[1500px] items-end px-5 pb-14 pt-24 sm:min-h-[650px] sm:px-8 sm:pb-20 lg:px-12">
        <div className="max-w-2xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-red-950/40 px-3 py-2 text-[10px] font-black tracking-[.2em] text-red-200"><Star size={12}/> DESTAQUE KAGEFLIX</p>
          <p className="mb-3 text-xs font-bold tracking-[.22em] text-red-300">{config.eyebrow}</p>
          <h1 className="text-5xl font-black leading-[.95] tracking-[-.055em] text-white drop-shadow-2xl sm:text-7xl">{item?.title || config.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-semibold text-zinc-300">
            {year && <span className="inline-flex items-center gap-1.5"><CalendarDays size={13}/>{String(year).slice(0,4)}</span>}
            {info?.rating && <span className="inline-flex items-center gap-1.5"><Star size={13} className="text-amber-300"/>{info.rating}</span>}
            {item?.categoryName && <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1.5">{item.categoryName}</span>}
          </div>
          <p className="mt-6 max-w-xl text-sm leading-7 text-zinc-200/90 sm:text-base">{description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#episodios" className="kf-primary !h-12 !rounded-lg !px-6"><Play size={16} fill="currentColor"/> Ver episódios</a>
            <a href="/catalogo?type=series" className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur hover:bg-white/15"><Clapperboard size={16}/> Explorar séries</a>
          </div>
        </div>
      </div>
    </section>

    <section id="episodios" className="mx-auto max-w-[1500px] scroll-mt-6 px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
      <div className="mb-7"><p className="kf-kicker mb-2">CONTINUE A AVENTURA</p><h2 className="text-2xl font-black sm:text-3xl">Episódios disponíveis</h2><p className="mt-2 text-sm text-zinc-500">{episodes.length.toLocaleString("pt-BR")} episódios encontrados na sua coleção.</p></div>
      {loading ? <div className="kf-panel flex min-h-48 items-center justify-center"><ContentLoader label="Buscando o conteúdo..." compact /></div> :
       error ? <div role="alert" className="kf-panel border-red-500/20 p-6 text-sm text-red-200">{error}</div> :
       !episodes.length ? <div className="kf-empty py-16 text-center"><Tv2 className="mx-auto mb-3 text-zinc-600" size={30}/><p className="font-bold">Nenhum episódio disponível</p><p className="mt-2 text-sm text-zinc-500">Este título foi localizado, mas não há episódios retornados pela lista.</p></div> :
       <div className="space-y-8">{groupedEpisodes.map(([season, list]) => <div key={season}><h3 className="mb-4 text-lg font-extrabold">Temporada {season}</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{list.map(episode => <button key={episode.id} onClick={() => setPlaying(episode)} className="group flex min-h-[92px] items-center gap-4 rounded-xl border border-white/[.08] bg-white/[.025] p-3 text-left transition hover:border-red-500/35 hover:bg-white/[.055]"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-red-600 text-white shadow-lg shadow-red-950/30 transition group-hover:scale-105"><Play size={17} fill="currentColor"/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-zinc-100">{episode.title}</span><span className="mt-1 block text-[11px] text-zinc-500">Episódio {episode.episode ?? "—"}</span></span></button>)}</div></div>)}</div>}
    </section>

    {playing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true"><div className="w-full max-w-6xl overflow-hidden rounded-xl border border-white/10 bg-[#111] shadow-2xl"><div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4"><div className="min-w-0"><p className="kf-kicker">REPRODUZINDO AGORA</p><h2 className="truncate text-sm font-extrabold">{item?.title} · {playing.title}</h2></div><button onClick={() => setPlaying(null)} aria-label="Fechar player" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-zinc-300 hover:bg-white/10"><X size={18}/></button></div><video ref={videoRef} controls autoPlay playsInline className="aspect-video max-h-[78vh] w-full bg-black"/></div></div>}
    <footer className="kf-footer px-5 py-7 text-center">© {new Date().getFullYear()} KAGEFLIX · TODOS OS DIREITOS RESERVADOS</footer>
    <MobileNav active="browse"/>
  </main>;
}
