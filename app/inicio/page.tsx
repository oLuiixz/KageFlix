"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronRight, Film, LogOut, Play, Search, Settings, ShieldCheck, Sparkles, Tv2, Layers3 } from "lucide-react";

type CatalogItem = { id: string; title: string; logoUrl: string | null; tvgName: string | null };
type Category = { name: string; slug: string; count: number; items: CatalogItem[] };

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    async function loadCatalog() {
      try {
        const response = await fetch("/api/catalog", { cache: "no-store" });
        if (!response.ok) throw new Error("catalog");
        const data = await response.json();
        const base = (data.categories || []).map((category: {name:string;count:number}) => ({
          name: category.name,
          slug: category.name === "Crunchyroll" ? "crunchyroll" : "funimation-now",
          count: Number(category.count || 0),
          items: []
        }));
        if (!alive) return;
        setIsAdmin(Boolean(data.canImport));
        setCategories(base);
        const results = await Promise.all(base.map(async (category: Category) => {
          try {
            const res = await fetch(`/api/catalog?category=${category.slug}`, { cache: "no-store" });
            if (!res.ok) return category;
            const payload = await res.json();
            return { ...category, items: (payload.items || []).slice(0, 18) };
          } catch { return category; }
        }));
        if (alive) setCategories(results);
      } catch {
        if (alive) setCategories([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    void loadCatalog();
    return () => { alive = false; };
  }, []);

  const filteredCategories = useMemo(() => categories.map(category => ({
    ...category,
    items: category.items.filter(item => item.title.toLowerCase().includes(search.toLowerCase()))
  })), [categories, search]);
  const total = categories.reduce((sum, category) => sum + category.count, 0);

  return (
    <main className="kf-app">
      <header className="kf-header">
        <div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <a href="/inicio" className="kf-brand" aria-label="KageFlix início">
            <span className="kf-brand-mark"><Tv2 size={20} strokeWidth={2.5}/></span>
            <span>KAGE<span className="text-[#ed1722]">FLIX</span></span>
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="/inicio" aria-current="page" className="kf-nav-link">Início</a>
            <a href="/iptv" className="kf-nav-link">TV, filmes e séries</a>
            <a href="#catalogos" className="kf-nav-link">Animes</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <label className="relative hidden sm:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar no catálogo" className="kf-control w-[190px] pl-9 text-xs lg:w-[230px]"/>
            </label>
            {isAdmin && <a href="/admin/catalogo" className="hidden rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-red-500/40 hover:text-white lg:inline-flex">Admin</a>}
            <a href="/configuracoes" aria-label="Configurações" className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-zinc-300 transition hover:border-red-500/40 hover:text-white"><Settings size={17}/></a>
            <form action="/api/auth/logout" method="post">
              <button aria-label="Sair" className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-zinc-300 transition hover:border-red-500/40 hover:text-white"><LogOut size={16}/></button>
            </form>
          </div>
        </div>
      </header>

      <section className="kf-hero px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-[1500px]">
          <div className="max-w-[720px]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/[.08] px-4 py-2 text-[10px] font-extrabold tracking-[.2em] text-red-300">
              <Sparkles size={13}/> SEU STREAMING DE ANIMES
            </div>
            <h1 className="kf-title">Histórias que<br/><span className="text-[#ed1722]">merecem ser vividas.</span></h1>
            <p className="mt-6 max-w-[540px] text-sm leading-7 text-zinc-300/75 sm:text-base">
              Entre em novos universos, descubra grandes aventuras e encontre seu próximo anime favorito em um só lugar.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="/iptv" className="kf-primary"><Play size={16} fill="currentColor"/> Explorar IPTV <ArrowRight size={15}/></a>
              <span className="kf-chip"><ShieldCheck size={14} className="text-red-400"/> Sua conta, seu catálogo</span>
            </div>
          </div>
          <div className="mt-14 flex flex-wrap gap-3 border-t border-white/[.09] pt-6">
            <div className="kf-chip"><Layers3 size={14}/> {categories.length || 2} categorias</div>
            <div className="kf-chip"><Film size={14}/> {total.toLocaleString("pt-BR")} títulos disponíveis</div>
            <div className="kf-chip"><Sparkles size={14}/> Experiência KageFlix</div>
          </div>
        </div>
      </section>

      <section id="catalogos" className="mx-auto max-w-[1500px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="kf-kicker mb-2">ESCOLHA SUA PRÓXIMA AVENTURA</p><h2 className="kf-section-title">Explore o catálogo</h2><p className="mt-2 text-sm text-zinc-500">Conteúdo organizado de acordo com a lista vinculada à sua conta.</p></div>
          <label className="relative w-full sm:hidden">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar anime..." className="kf-control w-full pl-9 text-sm"/>
          </label>
        </div>

        {loading ? <div className="kf-panel flex min-h-48 items-center justify-center text-sm text-zinc-400"><span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-red-500 border-t-transparent"/>Preparando seu catálogo...</div> :
          filteredCategories.length === 0 ? <div className="kf-empty px-6 py-14 text-center"><Tv2 className="mx-auto mb-4 text-zinc-600" size={30}/><h3 className="font-bold">Não foi possível carregar o catálogo</h3><p className="mt-2 text-sm text-zinc-500">Tente novamente em instantes.</p></div> :
          filteredCategories.map(category => (
            <div key={category.slug} className="mb-12">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div><p className="kf-kicker mb-2">KAGEFLIX ORIGINAL COLLECTION</p><h3 className="text-xl font-extrabold tracking-tight sm:text-2xl">{category.name}</h3><p className="mt-1 text-xs text-zinc-500">{category.count.toLocaleString("pt-BR")} títulos no seu catálogo</p></div>
                <a href={`/catalogo/${category.slug}`} className="inline-flex items-center gap-1 text-xs font-bold text-zinc-300 transition hover:text-white">Ver todos <ChevronRight size={15}/></a>
              </div>
              {category.items.length ? <div className="kf-scroll-row">
                {category.items.slice(0, 12).map(item => (
                  <a href={`/catalogo/${category.slug}`} key={item.id} className="kf-poster group">
                    <div className="kf-poster-art">
                      {item.logoUrl ? <img src={item.logoUrl} alt={item.title} loading="lazy"/> : <div className="px-3 text-center"><Tv2 className="mx-auto mb-3 text-red-500/60" size={30}/><span className="line-clamp-3 text-xs font-bold text-zinc-400">{item.title}</span></div>}
                    </div>
                    <div className="p-3"><p className="line-clamp-2 text-xs font-bold text-zinc-200 group-hover:text-white">{item.title}</p></div>
                  </a>
                ))}
              </div> : <a href={`/catalogo/${category.slug}`} className="kf-empty flex min-h-28 items-center justify-between px-5 py-5 transition hover:border-red-500/30"><div><p className="font-bold">{search ? "Nenhum resultado para essa busca" : "Seu catálogo está sendo preparado"}</p><p className="mt-1 text-xs text-zinc-500">{search ? "Tente outro título." : "Acesse a categoria para ver todos os detalhes."}</p></div><ChevronRight className="text-zinc-500"/></a>}
            </div>
          ))
        }
      </section>

      <section id="filmes" className="mx-auto max-w-[1500px] px-5 pb-16 sm:px-8 lg:px-12">
        <div className="kf-panel relative overflow-hidden p-6 sm:p-9">
          <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-red-600/[.08] blur-3xl"/>
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-red-400"><Film size={24}/></div><div><p className="kf-kicker mb-1">EM DESENVOLVIMENTO</p><h3 className="text-lg font-extrabold">Uma nova experiência de filmes</h3><p className="mt-1 max-w-xl text-sm text-zinc-500">Estamos preparando esta área para ampliar seu universo de entretenimento.</p></div></div>
            <span className="kf-chip w-fit border-amber-400/20 bg-amber-400/[.06] text-amber-200">Em breve</span>
          </div>
        </div>
      </section>
      <footer className="kf-footer px-5 py-7 text-center sm:px-8">© {new Date().getFullYear()} KAGEFLIX · TODOS OS DIREITOS RESERVADOS</footer>
    </main>
  );
}
