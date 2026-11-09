"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Search, Play, Tv2, LoaderCircle, SlidersHorizontal, Sparkles } from "lucide-react";

type CatalogItem = { id: string; title: string; logoUrl: string | null; tvgName: string | null };

export default function CategoryCatalogPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const category = slug === "crunchyroll" ? "Crunchyroll" : slug === "funimation-now" ? "Funimation Now" : null;
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    if (!category) { setError("Categoria não encontrada."); setLoading(false); return; }
    fetch(`/api/catalog?category=${slug}`, { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível carregar o catálogo.");
        if (alive) setItems(data.items || []);
      })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : "Falha ao carregar catálogo."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [category, slug]);

  const filtered = useMemo(() => items.filter(item => item.title.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))), [items, search]);

  return (
    <main className="kf-app">
      <header className="kf-header">
        <div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a href="/inicio" className="kf-brand"><span className="kf-brand-mark"><Tv2 size={20}/></span><span>KAGE<span className="text-[#ed1722]">FLIX</span></span></a>
          <a href="/configuracoes" className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-300 transition hover:border-red-500/40 hover:text-white">Minha conta</a>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-white/[.06] bg-[radial-gradient(ellipse_at_80%_30%,rgba(145,0,12,.3),transparent_42%),linear-gradient(120deg,#100b0d,#09090a_65%)] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="mx-auto max-w-[1500px]">
          <a href="/inicio" className="mb-9 inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 transition hover:text-white"><ArrowLeft size={15}/> Voltar ao início</a>
          <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[.22em] text-red-300"><Sparkles size={13}/> COLEÇÃO KAGEFLIX</div>
              <h1 className="text-4xl font-black tracking-[-.05em] sm:text-5xl">{category || "Catálogo"}</h1>
              <p className="mt-3 text-sm text-zinc-400">Explore os títulos disponíveis na lista vinculada à sua conta.</p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-3 py-2 text-xs font-semibold text-zinc-300"><Play size={13} className="text-red-400"/>{items.length.toLocaleString("pt-BR")} títulos disponíveis</div>
            </div>
            <label className="relative block w-full lg:max-w-[360px]">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar título..." className="kf-control h-12 w-full pl-11 pr-4 text-sm"/>
            </label>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-5 py-9 sm:px-8 sm:py-12 lg:px-12">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div><p className="kf-kicker mb-1">DESCUBRA ALGO NOVO</p><h2 className="text-xl font-extrabold">Todos os títulos</h2></div>
          <span className="inline-flex items-center gap-2 text-xs text-zinc-500"><SlidersHorizontal size={14}/>{filtered.length} resultados</span>
        </div>
        {loading ? (
          <div className="kf-panel flex min-h-64 items-center justify-center gap-3 text-sm text-zinc-400"><LoaderCircle size={19} className="animate-spin text-red-500"/> Carregando sua coleção...</div>
        ) : error ? (
          <div role="alert" className="kf-panel border-red-500/20 p-7 text-sm text-red-200">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="kf-empty px-6 py-20 text-center">
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[.035] text-zinc-500"><Tv2 size={28}/></div>
            <h2 className="text-lg font-extrabold">{search ? "Nenhum título encontrado" : "Nenhum título importado ainda"}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">{search ? "Experimente buscar por outro nome." : "Esta categoria está pronta. Assim que sua lista for sincronizada, os títulos aparecerão aqui."}</p>
            {!search && <a href="/configuracoes" className="kf-primary mt-6">Ver conexão da lista</a>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {filtered.map(item => (
              <article key={item.id} className="kf-poster group">
                <div className="kf-poster-art">
                  {item.logoUrl ? <img src={item.logoUrl} alt={item.title} loading="lazy"/> : <div className="px-4 text-center"><Tv2 className="mx-auto mb-3 text-red-500/65" size={32}/><span className="line-clamp-4 text-xs font-bold text-zinc-400">{item.title}</span></div>}
                </div>
                <div className="min-h-[64px] p-3"><h2 className="line-clamp-2 text-xs font-bold leading-5 text-zinc-200 group-hover:text-white">{item.title}</h2></div>
              </article>
            ))}
          </div>
        )}
      </section>
      <footer className="kf-footer px-5 py-7 text-center">© {new Date().getFullYear()} KAGEFLIX · TODOS OS DIREITOS RESERVADOS</footer>
    </main>
  );
}
