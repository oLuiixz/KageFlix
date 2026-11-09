"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Play, Tv2, LoaderCircle } from "lucide-react";

type CatalogItem = { id: string; title: string; logoUrl: string | null; tvgName: string | null };

export default function CategoryCatalogPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const category = slug === "crunchyroll" ? "Crunchyroll" : slug === "funimation-now" ? "Funimation Now" : null;
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!category) { setError("Categoria não encontrada."); setLoading(false); return; }
    fetch(`/api/catalog?category=${slug}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Não foi possível carregar o catálogo.");
        setItems(data.items || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Falha ao carregar catálogo."))
      .finally(() => setLoading(false));
  }, [category, slug]);

  return (
    <main className="min-h-screen bg-[#080808] px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-7xl">
        <a href="/inicio" className="mb-10 inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:border-red-500/40 hover:text-white">
          <ArrowLeft size={16} /> Voltar ao início
        </a>
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[.04]">
            {slug === "crunchyroll" ? <Play size={22} /> : <Tv2 size={22} />}
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[.2em] text-red-500">CATÁLOGO KAGEFLIX</p>
            <h1 className="text-3xl font-black">{category || "Categoria"}</h1>
            <p className="mt-1 text-sm text-zinc-500">{items.length} títulos disponíveis</p>
          </div>
        </div>
        {loading ? (
          <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-zinc-400"><LoaderCircle className="animate-spin" size={20} /> Carregando catálogo...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[.06] p-6 text-sm text-red-200">{error}</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[.025] px-6 py-16 text-center">
            <Tv2 className="mx-auto mb-4 text-zinc-500" size={30} />
            <h2 className="text-lg font-bold">Nenhum título importado ainda</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">Esta categoria está pronta, mas a lista de conteúdo ainda não foi carregada para sua conta.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-xl border border-white/10 bg-[#111]">
                <div className="flex aspect-[3/4] items-center justify-center bg-gradient-to-br from-red-950/40 to-zinc-950 p-4">
                  {item.logoUrl ? <img src={item.logoUrl} alt="" className="max-h-full max-w-full object-contain" /> : <Tv2 size={34} className="text-zinc-600" />}
                </div>
                <div className="p-3"><h2 className="line-clamp-2 text-sm font-semibold">{item.title}</h2></div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
