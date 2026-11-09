"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Database, LoaderCircle, Plus, RefreshCw, ShieldAlert, Tv2, UserRoundPlus } from "lucide-react";

type Client = { id: string; username: string; displayName: string; active: boolean; hasPlaylist: boolean; itemCount: number };

export default function ClientsPanel() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null);
  const [form, setForm] = useState({ displayName: "", username: "", password: "", playlistUrl: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/clients", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar os clientes.");
      setClients(data.clients || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar clientes."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice(""); setCreatedCredentials(null);
    try {
      const response = await fetch("/api/admin/clients", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível cadastrar o cliente.");
      setNotice(`Cliente ${data.client.displayName} cadastrado. A M3U foi armazenada criptografada no Neon.`);
      setCreatedCredentials({ username: form.username, password: form.password });
      setForm({ displayName: "", username: "", password: "", playlistUrl: "" });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao cadastrar cliente."); }
    finally { setSaving(false); }
  }

  async function importCatalog(userId: string) {
    setImporting(userId); setError(""); setNotice("");
    try {
      const response = await fetch("/api/catalog/import", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "A sincronização não foi concluída.");
      setNotice(`Catálogo sincronizado: ${data.imported} itens importados para este cliente.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao sincronizar catálogo."); }
    finally { setImporting(""); }
  }

  return (
    <main className="min-h-screen bg-[#080808] px-5 py-8 text-white sm:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/inicio" className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"><ArrowLeft size={16} /> Voltar ao KageFlix</Link>
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-end">
          <div><div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[.2em] text-red-400"><Database size={15} /> ADMINISTRAÇÃO</div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Clientes e acessos</h1><p className="mt-2 text-sm text-zinc-400">Cada cliente tem seu login KageFlix e sua própria conexão IPTV.</p></div>
          <button onClick={load} disabled={loading || saving || Boolean(importing)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Atualizar</button>
        </div>

        <section className="mt-8 rounded-2xl border border-white/10 bg-[#111] p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400"><UserRoundPlus size={21} /></div><div><h2 className="text-lg font-bold">Cadastrar cliente</h2><p className="mt-1 text-sm text-zinc-400">A URL M3U é guardada criptografada e nunca volta a ser exibida.</p></div></div>
          <form onSubmit={createClient} className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-zinc-300">Nome do cliente<input required minLength={2} maxLength={100} value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-red-500/60" placeholder="Nome completo" /></label>
            <label className="text-xs font-semibold text-zinc-300">Usuário KageFlix<input required minLength={3} maxLength={40} value={form.username} onChange={e=>setForm({...form,username:e.target.value})} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-red-500/60" placeholder="usuario123" autoComplete="off" /></label>
            <label className="text-xs font-semibold text-zinc-300">Senha KageFlix<input required minLength={10} maxLength={200} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-red-500/60" placeholder="Mínimo de 10 caracteres" autoComplete="new-password" /></label>
            <label className="text-xs font-semibold text-zinc-300 sm:col-span-2">URL M3U individual do cliente<input required type="url" value={form.playlistUrl} onChange={e=>setForm({...form,playlistUrl:e.target.value})} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-red-500/60" placeholder="Cole a URL M3U completa do cliente" autoComplete="off" /></label>
            <div className="sm:col-span-2 flex flex-col gap-3 border-t border-white/[.08] pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-zinc-500">Por segurança, neste momento são aceitas URLs dos domínios xmrs2.top e newx2.top. A senha é armazenada somente como hash.</p><button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E50914] px-5 py-3 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-50">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />} {saving ? "Cadastrando..." : "Cadastrar cliente"}</button></div>
          </form>
        </section>

        {createdCredentials && <section className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[.06] p-5"><p className="text-sm font-bold text-emerald-200">Acesso criado. Guarde estes dados agora:</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><p className="text-[10px] font-bold tracking-wider text-emerald-200/60">USUÁRIO</p><p className="mt-1 select-all font-mono text-sm text-white">{createdCredentials.username}</p></div><div><p className="text-[10px] font-bold tracking-wider text-emerald-200/60">SENHA</p><p className="mt-1 select-all font-mono text-sm text-white">{createdCredentials.password}</p></div></div><p className="mt-3 text-xs text-emerald-100/60">A senha não será salva em texto puro nem poderá ser recuperada depois que esta tela for fechada.</p></section>}

        {(error || notice) && <div className={`mt-5 flex items-start gap-2 rounded-xl border p-4 text-sm ${error ? "border-red-500/20 bg-red-500/10 text-red-200" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"}`} role={error ? "alert" : "status"}>{error ? <ShieldAlert size={17} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={17} className="mt-0.5 shrink-0" />}{error || notice}</div>}

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between"><div><p className="mb-2 text-[10px] font-bold tracking-[.2em] text-red-400">BASE DE CLIENTES</p><h2 className="text-xl font-bold">Contas cadastradas</h2></div><span className="text-xs text-zinc-500">{clients.length} clientes</span></div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111]">
            {loading ? <div className="p-8 text-center text-sm text-zinc-500">Carregando clientes...</div> : clients.length === 0 ? <div className="p-8 text-center text-sm text-zinc-500">Nenhum cliente cadastrado ainda.</div> : <div className="divide-y divide-white/[.07]">{clients.map(client => <div key={client.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{client.displayName}</p><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${client.active ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-500/10 text-zinc-400"}`}>{client.active ? "ATIVO" : "INATIVO"}</span></div><p className="mt-1 text-xs text-zinc-500">@{client.username} · {client.hasPlaylist ? "M3U cadastrada" : "Sem M3U"} · {client.itemCount} itens</p></div><button onClick={()=>importCatalog(client.id)} disabled={!client.active || !client.hasPlaylist || Boolean(importing) || saving} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-zinc-200 transition hover:border-red-500/40 hover:bg-red-500/5 disabled:cursor-not-allowed disabled:opacity-40"><RefreshCw size={14} className={importing===client.id ? "animate-spin" : ""} />{importing===client.id ? "Sincronizando..." : "Sincronizar catálogo"}</button></div>)}</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
