"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, UserRound, CalendarDays, ShieldCheck, LoaderCircle, MonitorPlay } from "lucide-react";
import MobileNav from "@/components/mobile-nav";

type SettingsData = {
  account: { username: string; displayName: string; createdAt: string | null; lastLoginAt: string | null };
  plan: { status: string; expiresAt: string | null; trial: boolean };
};

function dateLabel(value: string | null) {
  if (!value) return "Não informado";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Não informado" : date.toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <main className="kf-app">
      <header className="kf-header"><div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-5 sm:px-8"><a href="/inicio" className="kf-brand"><span className="kf-brand-mark"><MonitorPlay size={20}/></span><span>KAGE<span className="text-[#ed1722]">FLIX</span></span></a><a href="/inicio" className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 transition hover:text-white"><ArrowLeft size={15}/> Voltar ao início</a></div></header>
      <div className="mx-auto max-w-[1200px] px-5 py-9 sm:px-8 sm:py-12">
        <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="kf-kicker mb-2">SUA EXPERIÊNCIA KAGEFLIX</p><h1 className="text-3xl font-black tracking-[-.045em] sm:text-4xl">Configurações</h1><p className="mt-2 text-sm text-zinc-500">Gerencie seus dados de acesso e acompanhe seu plano.</p></div>
          
        </div>

        {loading ? <div className="kf-panel flex min-h-56 items-center justify-center gap-3 text-sm text-zinc-400"><LoaderCircle size={18} className="animate-spin text-red-500"/> Carregando suas informações...</div> : data ? (
          <>
            <section className="kf-panel relative mb-5 overflow-hidden p-6 sm:p-8">
              <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-red-600/[.08] blur-3xl"/>
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-2xl border border-red-500/20 bg-red-500/[.09] text-red-300"><UserRound size={25}/></div><div><p className="text-[10px] font-bold tracking-[.2em] text-zinc-500">PERFIL KAGEFLIX</p><h2 className="mt-1 text-xl font-extrabold">{data.account.displayName}</h2><p className="mt-1 text-xs text-zinc-500">Usuário · {data.account.username}</p></div></div>
                
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="kf-panel p-6 sm:p-7">
                <div className="mb-6 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.05] text-zinc-300"><UserRound size={19}/></div><div><h3 className="font-extrabold">Minha conta</h3><p className="mt-1 text-xs text-zinc-500">Informações do seu acesso</p></div></div>
                <dl className="space-y-5">
                  <div className="flex items-center justify-between gap-4 border-b border-white/[.06] pb-4"><dt className="text-xs text-zinc-500">Nome de exibição</dt><dd className="text-right text-sm font-semibold">{data.account.displayName}</dd></div>
                  <div className="flex items-center justify-between gap-4 border-b border-white/[.06] pb-4"><dt className="text-xs text-zinc-500">Usuário</dt><dd className="text-right text-sm font-semibold">{data.account.username}</dd></div>
                  <div className="flex items-center justify-between gap-4"><dt className="inline-flex items-center gap-2 text-xs text-zinc-500"><CalendarDays size={14}/> Cliente desde</dt><dd className="text-right text-sm font-semibold">{dateLabel(data.account.createdAt)}</dd></div>
                </dl>
              </section>
              <section className="kf-panel p-6 sm:p-7">
                <div className="mb-6 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/[.08] text-red-300"><ShieldCheck size={19}/></div><div><h3 className="font-extrabold">Meu plano</h3><p className="mt-1 text-xs text-zinc-500">Detalhes da assinatura vinculada</p></div></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/[.06] bg-white/[.025] p-4"><p className="text-[10px] font-bold tracking-wider text-zinc-500">SITUAÇÃO</p><p className="mt-2 text-sm font-bold">{data.plan.status}</p></div>
                  <div className="rounded-xl border border-white/[.06] bg-white/[.025] p-4"><p className="text-[10px] font-bold tracking-wider text-zinc-500">MODALIDADE</p><p className="mt-2 text-sm font-bold">{data.plan.trial ? "Teste" : "Assinatura"}</p></div>
                  <div className="col-span-2 rounded-xl border border-white/[.06] bg-white/[.025] p-4"><p className="text-[10px] font-bold tracking-wider text-zinc-500">VENCIMENTO</p><p className="mt-2 text-sm font-bold">{dateLabel(data.plan.expiresAt)}</p></div>
                </div>
              </section>
            </div>

          </>
        ) : <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/[.07] p-4 text-sm text-red-200">{error || "Não foi possível carregar as configurações."}</p>}
      </div>
      <footer className="kf-footer px-5 py-7 text-center">© {new Date().getFullYear()} KAGEFLIX · TODOS OS DIREITOS RESERVADOS</footer>
          <MobileNav active="settings" />
      </main>
  );
}
