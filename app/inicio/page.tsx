"use client";

import { useEffect, useState } from "react";

import {
  LogOut,
  Tv2,
  Play,
  Film,
  Layers3,
  Construction,
  Sparkles,
  ArrowUpRight,
  LibraryBig,
  Settings
} from "lucide-react";

export default function HomePage() {
  const [catalogCounts, setCatalogCounts] = useState<Record<string, number>>({});
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/catalog", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (!data) return;
        const nextCounts: Record<string, number> = {};
        for (const category of data.categories || []) nextCounts[category.name] = category.count;
        setCatalogCounts(nextCounts);
        setIsAdmin(Boolean(data.canImport));
      })
      .catch(() => undefined);
  }, []);

  const seriesCategories = [
    {
      name: "Crunchyroll",
      count: catalogCounts["Crunchyroll"] ?? 0,
      description: "Animes e séries do catálogo Crunchyroll.",
      accent: "from-orange-500/20 via-red-500/10 to-transparent",
      icon: Play
    },
    {
      name: "Funimation Now",
      count: catalogCounts["Funimation Now"] ?? 0,
      description: "Títulos disponíveis na categoria Funimation Now.",
      accent: "from-violet-500/20 via-fuchsia-500/10 to-transparent",
      icon: Tv2
    }
  ];

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <header className="sticky top-0 z-30 border-b border-white/[.07] bg-[#090909]/90 px-5 py-4 backdrop-blur-xl sm:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <a href="/inicio" className="flex items-center gap-3" aria-label="KageFlix início">
            <span className="brand-mark"><Tv2 size={20} /></span>
            <span className="text-xl font-black tracking-[.12em]">KAGE<span className="text-[#E50914]">FLIX</span></span>
          </a>
          <div className="flex items-center gap-3 sm:gap-5">
            <span className="hidden text-xs font-semibold tracking-[.14em] text-zinc-500 sm:inline">SEU UNIVERSO DE ANIMES</span>
            {isAdmin && <a href="/admin/catalogo" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-red-500/40 hover:text-white">Gerenciar catálogo</a>}
            <a href="/configuracoes" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-red-500/40 hover:text-white"><Settings size={15} /> <span className="hidden sm:inline">Configurações</span></a>
            <form action="/api/auth/logout" method="post">
              <button className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:border-red-500/50 hover:text-white" aria-label="Sair da conta">
                <LogOut size={15} /> <span className="hidden sm:inline">Sair</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-white/[.06] px-5 py-16 sm:px-10 sm:py-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_42%,rgba(150,0,10,.25),transparent_48%),radial-gradient(ellipse_at_5%_100%,rgba(80,0,8,.16),transparent_38%)]" />
        <div className="absolute right-[-90px] top-[-170px] -z-10 h-[430px] w-[430px] rounded-full border border-red-500/10 shadow-[0_0_0_55px_rgba(229,9,20,.018),0_0_0_110px_rgba(229,9,20,.012)]" />
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/[.07] px-3 py-1.5 text-[10px] font-bold tracking-[.2em] text-red-300">
            <Sparkles size={13} /> BEM-VINDO À KAGEFLIX
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-[-.045em] sm:text-6xl">
            Seu próximo universo<br className="hidden sm:block" /> <span className="text-[#E50914]">começa aqui.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
            Explore as categorias do catálogo KageFlix. Estamos preparando a integração para trazer seus animes favoritos para um só lugar.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.03] px-3 py-2"><Layers3 size={14} /> 2 categorias de séries selecionadas</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.03] px-3 py-2"><LibraryBig size={14} /> Catálogo em preparação</span>
          </div>
        </div>
      </section>

      <section id="series" className="px-5 py-12 sm:px-10 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-[10px] font-bold tracking-[.22em] text-[#E50914]">CATÁLOGO INICIAL</p>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Séries e animes</h2>
              <p className="mt-2 text-sm text-zinc-500">As duas categorias escolhidas para a primeira integração.</p>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-zinc-400">Catálogo conectado</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {seriesCategories.map((category) => {
              const Icon = category.icon;
              return (
                <a href={`/catalogo/${category.name === "Crunchyroll" ? "crunchyroll" : "funimation-now"}`} key={category.name} aria-label={`Abrir catálogo ${category.name}`} className="group relative block overflow-hidden rounded-2xl border border-white/[.09] bg-[#111111] p-6 transition duration-300 hover:-translate-y-1 hover:border-red-500/50 hover:bg-[#141111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:p-8">
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${category.accent} opacity-80`} />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-white"><Icon size={22} /></div>
                      <span className="rounded-full border border-amber-400/20 bg-amber-400/[.07] px-3 py-1.5 text-[10px] font-bold tracking-[.1em] text-amber-200">CATÁLOGO</span>
                    </div>
                    <h3 className="mt-7 text-xl font-bold">{category.name}</h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">{category.description}</p>
                    <div className="mt-7 flex items-end justify-between border-t border-white/[.08] pt-5">
                      <div><p className="text-3xl font-black tabular-nums">{category.count}</p><p className="mt-1 text-[10px] font-semibold tracking-[.16em] text-zinc-500">ITENS CADASTRADOS</p></div>
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400">Ver catálogo <ArrowUpRight size={15} /></span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section id="filmes" className="px-5 pb-16 sm:px-10 sm:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <p className="mb-2 text-[10px] font-bold tracking-[.22em] text-zinc-500">EM BREVE</p>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Filmes</h2>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-white/[.16] bg-gradient-to-r from-[#151112] via-[#101010] to-[#0d0d0d] p-6 sm:p-9">
            <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-red-600/[.07] blur-3xl" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4 sm:items-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[.04] text-zinc-400"><Film size={25} /></div>
                <div>
                  <h3 className="text-lg font-bold">Categoria de filmes</h3>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-400">Esta área já está reservada. Vamos avaliar os animes disponíveis em filmes/VOD em uma próxima etapa.</p>
                </div>
              </div>
              <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[.08] px-4 py-2 text-[11px] font-bold tracking-[.12em] text-amber-200">
                <Construction size={14} /> EM CONSTRUÇÃO
              </span>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[.06] px-5 py-6 text-center text-[10px] tracking-[.14em] text-zinc-600 sm:px-10">
        © {new Date().getFullYear()} KAGEFLIX. TODOS OS DIREITOS RESERVADOS.
      </footer>
    </main>
  );
}
