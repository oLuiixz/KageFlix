"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clapperboard, Search, Tv2, LoaderCircle, ChevronRight, Layers3, Play, Sparkles } from "lucide-react";

type Kind = "vod" | "series";
type Category = { id: string; name: string; parentId: string | null };
type AnimeCategory = { name: string; slug: string; count: number };
const sections: { id: Kind; title: string; description: string; icon: typeof Tv2 }[] = [
  { id: "vod", title: "Filmes", description: "Explore os filmes disponíveis", icon: Clapperboard },
  { id: "series", title: "Séries", description: "Crunchyroll e Funimation Now", icon: Tv2 }
];
const catalogArtwork: Record<string, string> = {
  crunchyroll: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1400&q=85",
  "funimation-now": "https://images.unsplash.com/photo-1560972550-aba3456b5564?auto=format&fit=crop&w=1400&q=85"
};

export default function IptvLibraryPage() {
  const [kind, setKind] = useState<Kind>("series");
  const [categories, setCategories] = useState<Category[]>([]);
  const [animeCategories, setAnimeCategories] = useState<AnimeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(""); setCategories([]); setAnimeCategories([]);
    if (kind === "series") {
      fetch("/api/catalog", { cache: "no-store" })
        .then(async response => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Não foi possível carregar as categorias.");
          const allowed = (data.categories || []).filter((item: any) => ["crunchyroll", "funimation now"].includes(String(item.name).trim().toLocaleLowerCase("pt-BR")))
            .map((item: any) => ({ name: String(item.name), slug: String(item.name).toLowerCase() === "crunchyroll" ? "crunchyroll" : "funimation-now", count: Number(item.count || 0) }));
          if (alive) setAnimeCategories(allowed);
        })
        .catch(err => { if (alive) setError(err instanceof Error ? err.message : "Falha ao carregar as séries."); })
        .finally(() => { if (alive) setLoading(false); });
    } else {
      setLoading(false);
    }
    return () => { alive = false; };
  }, [kind]);

  const filtered = useMemo(() => categories.filter(category => category.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))), [categories, search]);
  const filteredAnime = useMemo(() => animeCategories.filter(category => category.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))), [animeCategories, search]);

  return <main className="kf-app min-h-screen">
    <header className="kf-header"><div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-12">
      <a href="/inicio" className="kf-brand"><span className="kf-brand-mark"><Tv2 size={20}/></span><span>KAGE<span className="text-[#ed1722]">FLIX</span></span></a>
      <a href="/inicio" className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white"><ArrowLeft size={15}/> Início</a>
    </div></header>

    <section className="relative isolate overflow-hidden border-b border-white/[.07] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
      <img src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=2200&q=90" alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,5,6,.98)_0%,rgba(5,5,6,.86)_42%,rgba(5,5,6,.35)_100%),linear-gradient(0deg,#090909_0%,transparent_60%)]"/>
      <div className="relative mx-auto max-w-[1500px]">
        <p className="kf-kicker mb-4 flex items-center gap-2"><Sparkles size={13}/> SUA PRÓXIMA MARATONA COMEÇA AQUI</p>
        <h1 className="max-w-3xl text-4xl font-black tracking-[-.055em] sm:text-6xl lg:text-7xl">Escolha. Aperte o play. <span className="text-[#ff343d]">Viva a história.</span></h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-300 sm:text-base">Um universo de histórias esperando por você. Explore seus catálogos e encontre sua próxima série favorita.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={() => { setKind("series"); setSearch(""); }} className="kf-primary"><Play size={15} fill="currentColor"/> Explorar séries</button>
          <span className="kf-chip"><Tv2 size={14}/> Streaming em uma experiência premium</span>
        </div>
        <div className="mt-12 flex gap-7 border-t border-white/15 pt-5">
          {sections.map(section => { const Icon = section.icon; return <button key={section.id} onClick={() => { setKind(section.id); setSearch(""); }} className={`flex items-center gap-2 border-b-2 pb-3 text-left transition ${kind === section.id ? "border-[#e50914] text-white" : "border-transparent text-zinc-400 hover:text-white"}`}>
            <Icon size={17}/><span className="font-bold">{section.title}</span>
          </button>; })}
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-[1500px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="kf-kicker mb-2">{kind === "series" ? "SEU UNIVERSO DE ANIMES" : "EM BREVE NO KAGEFLIX"}</p><h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{kind === "series" ? "Explore seus catálogos" : "Uma nova experiência está chegando"}</h2><p className="mt-2 text-sm text-zinc-500">{kind === "series" ? "Escolha um catálogo e descubra milhares de histórias." : "Estamos preparando uma seleção especial de filmes."}</p></div>
        {kind === "series" && <label className="relative block w-full sm:max-w-[340px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/><input className="kf-control w-full pl-9 text-sm" placeholder="Buscar catálogo..." value={search} onChange={event => setSearch(event.target.value)}/></label>}
      </div>
      {loading ? <div className="kf-panel flex min-h-48 items-center justify-center gap-3 text-sm text-zinc-400"><LoaderCircle className="animate-spin text-red-500" size={19}/> Carregando catálogo...</div> :
      error ? <div role="alert" className="kf-panel border-red-500/20 p-6 text-sm text-red-200">{error}</div> :
      kind === "vod" ? <div className="relative isolate flex min-h-[340px] items-center overflow-hidden rounded-lg border border-white/10 bg-[#141414] p-7 sm:p-12">
        <img src="https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1800&q=85" alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-65"/>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/80 to-black/15"/>
        <div className="max-w-xl"><p className="kf-kicker mb-3">EM DESENVOLVIMENTO</p><h3 className="text-3xl font-black tracking-tight sm:text-4xl">Uma coleção de filmes está a caminho.</h3><p className="mt-4 text-sm leading-7 text-zinc-300">Estamos preparando essa área para trazer uma experiência de cinema completa ao KageFlix.</p><button onClick={() => { setKind("series"); setSearch(""); }} className="kf-primary mt-7">Explorar séries <ChevronRight size={16}/></button></div>
      </div> :
      !filteredAnime.length ? <div className="kf-empty py-16 text-center"><Layers3 className="mx-auto mb-3 text-zinc-600" size={28}/><p className="font-bold">Catálogos de séries indisponíveis</p><p className="mt-2 text-sm text-zinc-500">Não encontramos Crunchyroll ou Funimation Now.</p></div> :
      <div className="grid gap-5 md:grid-cols-2">{filteredAnime.map((category, index) => <a key={category.slug} href={"/catalogo/" + category.slug} className="group relative isolate flex min-h-[300px] items-end overflow-hidden rounded-lg border border-white/10 bg-[#171717] transition duration-300 hover:-translate-y-1 hover:border-white/25 sm:min-h-[370px]">
        <img src={catalogArtwork[category.slug]} alt="" loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover transition duration-700 group-hover:scale-105"/>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/55 to-black/5"/>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/45 to-transparent"/>
        <div className="w-full p-6 sm:p-8">
          <p className="kf-kicker mb-2">CATÁLOGO {index + 1} · SÉRIES</p>
          <h3 className="text-3xl font-black tracking-tight sm:text-4xl">{category.name}</h3>
          <p className="mt-2 text-sm text-zinc-300">{category.count.toLocaleString("pt-BR")} títulos disponíveis</p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-white transition group-hover:text-red-300"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#e50914]"><Play size={15} fill="currentColor"/></span> Explorar catálogo <ChevronRight size={16}/></span>
        </div>
      </a>)}</div>}
    </section>
    <footer className="kf-footer px-5 py-7 text-center">© {new Date().getFullYear()} KAGEFLIX</footer>
  </main>;
}
