"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Database, RefreshCw, ShieldAlert, Tv2 } from "lucide-react";

type Category = { id: string; name: string; mediaType: string; enabled: boolean; count: number };\ntype Client = { id: string; username: string; displayName: string; active: boolean; hasPlaylist: boolean; itemCount: number };

export default function CatalogImportPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");\n  const [clients, setClients] = useState<Client[]>([]);\n  const [selectedUserId, setSelectedUserId] = useState("");

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/catalog", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível consultar o catálogo.");
      setCategories(data.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao consultar o catálogo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {\n    void loadCatalog();\n    fetch("/api/admin/clients", { cache: "no-store" }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Falha ao listar clientes."); setClients(d.clients || []); }).catch((e) => setError(e instanceof Error ? e.message : "Falha ao listar clientes."));\n  }, [loadCatalog]);

  async function importPlaylist() {
    setImporting(true);
    setError("");
    setMessage("");
    try {
      if (!selectedUserId) throw new Error("Selecione um cliente para importar.");\n      const response = await fetch("/api/catalog/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selectedUserId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "A importação não foi concluída.");
      setMessage(`Importação concluída: ${data.imported} itens processados.`);
      await loadCatalog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao importar a playlist.");
    } finally {
      setImporting(false);
    }
  }

  const total = categories.reduce((sum, category) => sum + category.count, 0);

  return (
    <main className="min-h-screen bg-[#080808] px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/inicio" className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"><ArrowLeft size={16} /> Voltar ao KageFlix</Link>
        <div className="flex flex-col justify-between gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[.2em] text-red-400"><Database size={15} /> ADMINISTRAÇÃO</div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Catálogo e importação</h1>
            <p className="mt-2 text-sm text-zinc-400">Gerencie a primeira sincronização das categorias de séries.</p>
          </div>
          <button onClick={loadCatalog} disabled={loading || importing} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Atualizar dados</button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#111] p-5"><p className="text-xs text-zinc-500">Itens importados</p><p className="mt-2 text-3xl font-black tabular-nums">{loading ? "—" : total}</p></div>
          <div className="rounded-2xl border border-white/10 bg-[#111] p-5"><p className="text-xs text-zinc-500">Categorias ativas</p><p className="mt-2 text-3xl font-black tabular-nums">{loading ? "—" : categories.filter((item) => item.enabled).length}</p></div>
          <div className="rounded-2xl border border-white/10 bg-[#111] p-5"><p className="text-xs text-zinc-500">Tipo de conteúdo</p><p className="mt-2 text-3xl font-black">Séries</p></div>
        </div>

        <section className="mt-8 rounded-2xl border border-white/10 bg-[#111] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400"><Tv2 size={21} /></div>
            <div><h2 className="text-lg font-bold">Categorias selecionadas</h2><p className="mt-1 text-sm leading-6 text-zinc-400">A importação lê a playlist configurada no servidor e considera somente os grupos com nome exato Crunchyroll e Funimation Now. Os links de reprodução são armazenados criptografados.</p></div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {["Crunchyroll", "Funimation Now"].map((name) => {
              const category = categories.find((item) => item.name === name);
              return <div key={name} className="flex items-center justify-between rounded-xl border border-white/[.08] bg-black/20 p-4"><div><p className="font-semibold">{name}</p><p className="mt-1 text-xs text-zinc-500">Séries</p></div><span className="text-xl font-black tabular-nums">{loading ? "—" : category?.count ?? 0}</span></div>;
            })}
          </div>

          {error && <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200"><ShieldAlert size={17} className="mt-0.5 shrink-0" />{error}</div>}
          {message && <div role="status" className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200"><CheckCircle2 size={17} className="mt-0.5 shrink-0" />{message}</div>}

          <div className="mt-7 flex flex-col gap-3 border-t border-white/[.08] pt-6">\n            <label className="text-xs font-semibold text-zinc-400" htmlFor="catalog-client">Cliente para importar</label>\n            <select id="catalog-client" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-red-500/50">\n              <option value="">Selecione um cliente</option>\n              {clients.map((client) => <option key={client.id} value={client.id}>{client.displayName} ({client.username}){client.itemCount ? ` · ${client.itemCount} itens` : ""}</option>)}\n            </select>\n            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs leading-5 text-zinc-500">A importação atualiza os itens existentes sem duplicá-los. Somente um administrador autenticado pode iniciar o processo.</p>
            <button onClick={importPlaylist} disabled={loading || importing || !selectedUserId} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#E50914] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(229,9,20,.2)] transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={16} className={importing ? "animate-spin" : ""} />{importing ? "Importando playlist..." : "Importar playlist M3U"}</button>
          </div>
        </section>
      </div>
    </main>
  );
}
