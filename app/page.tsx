"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles, Tv2 } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      let deviceId = localStorage.getItem("kageflix_device_id");
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("kageflix_device_id", deviceId);
      }
      const deviceLabel = `${navigator.platform || "Dispositivo"} · ${navigator.userAgent.slice(0, 80)}`;
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password, deviceId, deviceLabel })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Não foi possível validar seu acesso.");
        return;
      }
      window.location.assign("/inicio");
    } catch {
      setError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-scene flex min-h-screen flex-col">
      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10 lg:px-16">
        <a href="/" className="flex items-center gap-3" aria-label="KageFlix início">
          <span className="brand-mark"><Tv2 size={21} strokeWidth={2.5} /></span>
          <span className="text-[21px] font-black tracking-[.13em] text-white">KAGE<span className="text-[#E50914]">FLIX</span></span>
        </a>
        <div className="hidden items-center gap-2 text-xs font-medium tracking-[.12em] text-zinc-500 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E50914] shadow-[0_0_10px_#E50914]" /> ACESSO RESTRITO
        </div>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-[1180px] flex-1 items-center justify-center gap-20 px-5 pb-14 pt-5 lg:justify-between lg:px-12">
        <div className="hidden max-w-[490px] lg:block">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#e50914]/25 bg-[#e50914]/[.07] px-4 py-2 text-[11px] font-bold tracking-[.2em] text-[#ff6870]">
            <Sparkles size={13} /> SEU UNIVERSO COMEÇA AQUI
          </div>
          <h1 className="text-[58px] font-black leading-[1.04] tracking-[-.055em] text-white xl:text-[68px]">
            Entre no seu<br />próximo <span className="text-[#E50914]">mundo.</span>
          </h1>
          <p className="mt-6 max-w-[390px] text-[15px] leading-7 text-zinc-400">Histórias épicas, personagens inesquecíveis e universos que esperam por você.</p>
          <div className="mt-12 flex items-center gap-4 border-t border-white/10 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[.06] text-[#E50914]"><ShieldCheck size={20} /></div>
            <div><p className="text-sm font-semibold text-zinc-200">Ambiente protegido</p><p className="mt-1 text-xs text-zinc-500">Acesso somente para contas autorizadas.</p></div>
          </div>
        </div>

        <div className="login-card w-full max-w-[440px] rounded-2xl p-7 sm:p-10">
          <div className="mb-8 lg:hidden">
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#E50914] text-white shadow-red"><Tv2 size={22} /></div>
            <h1 className="text-3xl font-black tracking-tight text-white">Seu próximo <span className="text-[#E50914]">mundo.</span></h1>
          </div>
          <div className="mb-8">
            <p className="text-[11px] font-bold tracking-[.22em] text-[#f0444c]">BEM-VINDO DE VOLTA</p>
            <h2 className="mt-3 text-[27px] font-bold tracking-tight text-white">Acesse sua conta</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Entre com as credenciais fornecidas pelo administrador.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="mb-2 block text-xs font-semibold text-zinc-300">Usuário</label>
              <input id="username" name="username" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Digite seu usuário" className="login-input" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="block text-xs font-semibold text-zinc-300">Senha</label><LockKeyhole size={14} className="text-zinc-600" /></div>
              <div className="relative">
                <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Digite sua senha" className="login-input pr-12" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-500 transition hover:text-white">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
            {error && <div role="alert" className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
            <button type="submit" disabled={loading || !username.trim() || !password} className="login-submit mt-2">
              {loading ? "Validando acesso..." : <>Entrar na KageFlix <ArrowRight size={17} /></>}
            </button>
          </form>
          <div className="mt-7 flex items-start gap-3 border-t border-white/[.08] pt-6">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#E50914]" />
            <p className="text-[11px] leading-5 text-zinc-500">Sua conta precisa estar cadastrada e ativa em nosso servidor. Não existe cadastro público.</p>
          </div>
        </div>
      </section>

      <footer className="relative z-10 flex flex-col items-center justify-between gap-2 border-t border-white/[.06] px-6 py-5 text-[10px] tracking-[.12em] text-zinc-600 sm:flex-row sm:px-10 lg:px-16">
        <span>© {new Date().getFullYear()} KAGEFLIX. TODOS OS DIREITOS RESERVADOS.</span><span>FEITO PARA QUEM AMA ANIME.</span>
      </footer>
    </main>
  );
}
