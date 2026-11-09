"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, Settings, UserRound, CalendarDays, ShieldCheck, ListRestart, LoaderCircle } from "lucide-react";

type SettingsData = {
  account: { username: string; displayName: string; createdAt: string | null; lastLoginAt: string | null; playlistConnected: boolean };
  plan: { status: string; expiresAt: string | null; trial: boolean; maxConnections: string | null; activeConnections: string | null };
};

function dateLabel(value: string | null) {
  if (!value) return "Não informado";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Não informado" : date.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/account/settings", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível carregar os dados.");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar configurações.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function refreshList() {
    setRefreshing(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/catalog/refresh", { method: "POST", cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar a lista.");
      setSuccess(`Lista atualizada! ${result.imported} títulos sincronizados.`);
      window.dispatchEvent(new Event("kageflix:catalog-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar a lista.");
    } finally { setRefreshing(false); }
  }

  return (
    <main className="min-h-screen bg-[#080808] px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-5xl">
        <a href="/inicio" className="mb-8 inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:border-red-500/40 hover:text-white"><ArrowLeft size={16} /> Voltar ao início</a>
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/[.08] text-red-400"><Settings size={22} /></div>
          <div><p className="text-[10px] font-bold tracking-[.22em] text-red-500">KAGEFLIX</p><h1 className="text-3xl font-black">Configurações</h1><p className="mt-1 text-sm text-zinc-500">Sua conta, plano e conexão da lista.</p></div>
        </div>
        {loading ? <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-zinc-400"><LoaderCircle className="animate-spin" size={18} /> Carregando informações...</div> : data ? (
          <div className="grid gap-5 md:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-[#111] p-6">
              <div className="mb-5 flex items-center gap-3"><UserRound className="text-red-400" size={19} /><h2 className="text-lg font-bold">Minha conta</h2></div>
              <dl className="space-y-4 text-sm">
                <div><dt className="text-xs text-zinc-500">Nome de exibição</dt><dd className="mt-1 font-semibold">{data.account.displayName}</dd></div>
                <div><dt className="text-xs text-zinc-500">Usuário</dt><dd className="mt-1 font-semibold">{data.account.username}</dd></div>
                <div><dt className="text-xs text-zinc-500">Cliente desde</dt><dd className="mt-1 font-semibold">{dateLabel(data.account.createdAt)}</dd></div>
              </dl>
            </section>
            <section className="rounded-2xl border border-white/10 bg-[#111] p-6">
              <div className="mb-5 flex items-center gap-3"><ShieldCheck className="text-red-400" size={19} /><h2 className="text-lg font-bold">Meu plano</h2></div>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-xs text-zinc-500">Situação</dt><dd className="mt-1 font-semibold">{data.plan.status}</dd></div>
                <div><dt className="text-xs text-zinc-500">Modalidade</dt><dd className="mt-1 font-semibold">{data.plan.trial ? "Teste" : "Assinatura"}</dd></div>
                <div className="col-span-2"><dt className="text-xs text-zinc-500">Vencimento</dt><dd className="mt-1 font-semibold">{dateLabel(data.plan.expiresAt)}</dd></div>
                <div><dt className="text-xs text-zinc-500">Conexões permitidas</dt><dd className="mt-1 font-semibold">{data.plan.maxConnections || "—"}</dd></div>
                <div><dt className="text-xs text-zinc-500">Conexões ativas</dt><dd className="mt-1 font-semibold">{data.plan.activeConnections || "—"}</dd></div>
              </dl>
            </section>
            <section className="rounded-2xl border border-white/10 bg-[#111] p-6 md:col-span-2">
              <div className="mb-4 flex items-center gap-3"><ListRestart className="text-red-400" size={20} /><div><h2 className="text-lg font-bold">Lista de conteúdo</h2><p className="mt-1 text-sm text-zinc-500">Reconecte ao servidor e sincronize novamente os títulos da sua conta.</p></div></div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm"><p className="font-semibold">{data.account.playlistConnected ? "Lista conectada" : "Lista não conectada"}</p><p className="mt-1 text-xs text-zinc-500">A atualização busca a versão mais recente disponível no servidor.</p></div>
                <button onClick={refreshList} disabled={refreshing || !data.account.playlistConnected} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#E50914] px-5 py-3 text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />{refreshing ? "Atualizando lista..." : "Reconectar / Atualizar lista"}</button>
              </div>
              {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[.07] p-3 text-sm text-red-200">{error}</p>}
              {success && <p role="status" className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[.07] p-3 text-sm text-emerald-200">{success}</p>}
            </section>
          </div>
        ) : <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/[.07] p-4 text-sm text-red-200">{error || "Não foi possível carregar as configurações."}</p>}
      </div>
    </main>
  );
}
