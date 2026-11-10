"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clapperboard, Radio, Search, Tv2, LoaderCircle, ChevronRight, Layers3 } from "lucide-react";

type Kind = "live" | "vod" | "series";
type Category = { id: string; name: string; parentId: string | null };
const sections: { id: Kind; title: string; description: string; icon: typeof Tv2 }[] = [
  { id: "live", title: "TV ao vivo", description: "Canais e programação ao vivo", icon: Radio },
  { id: "vod", title: "Filmes", description: "Filmes disponíveis na sua lista", icon: Clapperboard },
  { id: "series", title: "Séries", description: "Séries, temporadas e episódios", icon: Tv2 }
];

export default function IptvLibraryPage() {
  const [kind, setKind] = useState<Kind>("vod");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(""); setCategories([]);
    fetch(`/api/xtream?type=${kind}&action=categories`, { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível carregar as categorias.");
        if (alive) setCategories(data.categories || []);
      })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : "Falha na conexão IPTV."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [kind]);

  const filtered = useMemo(() => categories.filter(category => category.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))), [categories, search]);

  return <main className="kf-app min-h-screen">
    <header className="kf-header"><div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-12">
      <a href="/inicio" className="kf-brand"><span className="kf-brand-mark"><Tv2 size={20}/></span><span>KAGE<span className="text-[#ed1722]">FLIX</span></span></a>
      <a href="/inicio" className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white"><ArrowLeft size={15}/> Início</a>
    </div></header>
    <section className="border-b border-white/[.07] bg-[#111] px-5 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1500px]"><p className="kf-kicker mb-3">SUA BIBLIOTECA</p><h1 className="text-4xl font-black tracking-[-.05em] sm:text-5xl">Tudo o que você quer assistir.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">Filmes, séries e canais ao vivo reunidos em um só lugar.</p>
        <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-0">
          {sections.map(section => { const Icon = section.icon; return <button key={section.id} onClick={() => setKind(section.id)} className={`min-w-[120px] border-b-2 px-4 py-4 text-left transition ${kind === section.id ? "border-[#e50914] text-white" : "border-transparent text-zinc-400 hover:text-white"}`}>
            <div className="mb-2 flex items-center gap-2"><Icon size={17}/></div>
            <h2 className="font-extrabold">{section.title}</h2>
          </button>; })}
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-[1500px] px-5 py-9 sm:px-8 lg:px-12">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="kf-kicker mb-1">BIBLIOTECA</p><h2 className="text-2xl font-extrabold">{sections.find(item => item.id === kind)?.title}</h2><p className="mt-1 text-xs text-zinc-500">{categories.length.toLocaleString("pt-BR")} categorias encontradas</p></div>
        <label className="relative block w-full sm:max-w-[340px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/><input className="kf-control w-full pl-9 text-sm" placeholder="Buscar categoria..." value={search} onChange={event => setSearch(event.target.value)}/></label>
      </div>
      {loading ? <div className="kf-panel flex min-h-48 items-center justify-center gap-3 text-sm text-zinc-400"><LoaderCircle className="animate-spin text-red-500" size={19}/> Consultando seu servidor IPTV...</div> :
      error ? <div role="alert" className="kf-panel border-red-500/20 p-6 text-sm text-red-200">{error}</div> :
      !filtered.length ? <div className="kf-empty py-16 text-center"><Layers3 className="mx-auto mb-3 text-zinc-600" size={28}/><p className="font-bold">Nenhuma categoria encontrada</p></div> :
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map(category => <a key={category.id} href={`/explorar/${kind}/${encodeURIComponent(category.id)}`} className="kf-panel group flex items-center justify-between p-5 transition hover:border-red-500/30 hover:bg-white/[.04]"><div className="min-w-0"><h3 className="truncate text-sm font-bold text-zinc-200 group-hover:text-white">{category.name}</h3><p className="mt-1 text-[11px] text-zinc-500">Explorar</p></div><ChevronRight size={18} className="shrink-0 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-red-400"/></a>)}</div>}
    </section>
    <footer className="kf-footer px-5 py-7 text-center">© {new Date().getFullYear()} KAGEFLIX</footer>
  </main>;
}
