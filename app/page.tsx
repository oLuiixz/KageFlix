"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles, Tv2, Play, Layers3 } from "lucide-react";

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
    <main className="kf-login min-h-screen overflow-hidden text-white">
      <div className="kf-login-noise" aria-hidden="true" />
      {loading && (
        <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-[#07070a]/95 px-6 backdrop-blur-xl" role="status" aria-live="polite">
          <div className="w-full max-w-md text-center">
            <div className="mover mx-auto mb-12" aria-hidden="true" />
            <p className="text-[10px] font-bold tracking-[.3em] text-red-400">KAGEFLIX</p>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">Preparando seu universo</h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-400">Estamos conectando sua conta e preparando sua lista de animes. No primeiro acesso, o catálogo é baixado e organizado automaticamente.</p>
            <p className="mt-7 text-xs font-medium text-zinc-500">Aguarde só mais um instante...</p>
          </div>
          <style jsx>{`
            .mover{background:#ef2636;height:7px;width:76px;border-radius:10px;position:relative;animation:mover5 1.8s ease-in-out infinite;box-shadow:0 0 24px #ef263688}
            .mover:before,.mover:after{content:'';position:absolute;height:7px;border-radius:10px;left:16px;animation:mover5 1.8s ease-in-out infinite}
            .mover:before{background:#a80f25;top:16px;width:48px}.mover:after{background:#ff7880;top:-16px;width:58px}
            @keyframes mover5{0%,100%{transform:translateX(25px)}50%{transform:translateX(-25px)}}
            @media(prefers-reduced-motion:reduce){.mover,.mover:before,.mover:after{animation:none}}
          `}</style>
        </div>
      )}

      <header className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-6 sm:px-10 lg:px-14">
        <a href="/" className="group flex items-center gap-3" aria-label="KageFlix início">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff4858] to-[#a50924] shadow-[0_8px_30px_#e509143d]"><Tv2 size={20} strokeWidth={2.4}/></span>
          <span className="text-[19px] font-black tracking-[.16em]">KAGE<span className="text-[#f04455]">FLIX</span></span>
        </a>
        <div className="hidden items-center gap-2 rounded-full border border-white/[.09] bg-white/[.035] px-4 py-2 text-[10px] font-semibold tracking-[.2em] text-zinc-400 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]"/> PLATAFORMA PRIVADA
        </div>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-150px)] w-full max-w-[1440px] items-center gap-12 px-5 pb-12 pt-4 sm:px-10 lg:grid-cols-[1.05fr_.85fr] lg:gap-20 lg:px-14">
        <div className="relative hidden min-h-[590px] items-center lg:flex">
          <div className="absolute inset-0 overflow-hidden rounded-[34px] border border-white/[.07] bg-[#111016]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_25%,#8c142b66,transparent_35%),radial-gradient(ellipse_at_20%_85%,#45203e55,transparent_38%),linear-gradient(135deg,#19141d_0%,#0b0b10_55%,#180b12_100%)]"/>
            <div className="absolute -right-24 top-[-10%] h-[520px] w-[520px] rounded-full border border-white/[.06]"/>
            <div className="absolute -right-5 top-[5%] h-[390px] w-[390px] rounded-full border border-white/[.07]"/>
            <div className="absolute right-[12%] top-[18%] h-[270px] w-[270px] rounded-full border border-[#ef334c]/20 bg-[radial-gradient(circle_at_35%_30%,#ff687733,transparent_55%)] shadow-[0_0_100px_#e5091420]"/>
            <div className="absolute bottom-0 left-0 right-0 h-[48%] bg-gradient-to-t from-[#09090d] via-[#09090dcc] to-transparent"/>
            <div className="absolute right-[16%] top-[20%] h-[330px] w-[190px] rotate-[13deg] rounded-[48%_48%_18%_18%] border border-[#ff7880]/20 bg-gradient-to-b from-[#d72c4a]/20 via-[#341522]/55 to-[#08080c] shadow-[0_0_90px_#e5091425]"/>
            <div className="absolute right-[22%] top-[17%] h-[105px] w-[105px] rounded-full border border-[#ff8791]/20 bg-[radial-gradient(circle_at_35%_30%,#ffb1b8,#8e1c36_65%,#160b12)] shadow-[0_0_70px_#e5091440]"/>
            <div className="absolute bottom-10 left-10 right-10">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#f04455]/25 bg-[#e50914]/10 px-3 py-1.5 text-[9px] font-bold tracking-[.24em] text-[#ff8791]"><Sparkles size={12}/> SEU UNIVERSO, SEM LIMITES</div>
              <h1 className="max-w-[560px] text-[58px] font-black leading-[.98] tracking-[-.065em] xl:text-[70px]">Uma nova história <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6878] to-[#c51c3c]">começa aqui.</span></h1>
              <p className="mt-5 max-w-[410px] text-[14px] leading-7 text-zinc-400">Seus animes favoritos, organizados em um só lugar. Entre e continue de onde sua próxima aventura começa.</p>
              <div className="mt-8 flex items-center gap-3 text-[10px] font-semibold tracking-[.16em] text-zinc-500"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[.04] text-[#ff6474]"><Play size={13} fill="currentColor"/></span> DESCUBRA • ASSISTA • VIVA</div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[480px] lg:mr-auto">
          <div className="mb-8 lg:hidden">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff4858] to-[#a50924] shadow-[0_8px_30px_#e509143d]"><Tv2 size={23}/></div>
            <p className="mb-2 text-[10px] font-bold tracking-[.25em] text-[#ff6878]">BEM-VINDO À KAGEFLIX</p>
            <h1 className="text-4xl font-black leading-tight tracking-[-.05em]">Sua próxima história <span className="text-[#ef4054]">espera por você.</span></h1>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-white/[.10] bg-[#111116]/90 p-7 shadow-[0_30px_100px_#00000080] backdrop-blur-2xl sm:p-10">
            <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#f04455]/80 to-transparent"/>
            <div className="mb-9">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-[#f04455]/20 bg-[#e50914]/10 text-[#ff6474]"><LockKeyhole size={19}/></div>
              <p className="text-[10px] font-bold tracking-[.25em] text-[#ff6878]">ÁREA DO ASSINANTE</p>
              <h2 className="mt-3 text-[30px] font-bold tracking-[-.04em] text-white">Entre na sua conta</h2>
              <p className="mt-2 text-[13px] leading-6 text-zinc-500">Use o mesmo usuário e senha do seu acesso IPTV.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="mb-2.5 block text-[11px] font-semibold tracking-wide text-zinc-300">USUÁRIO</label>
                <input id="username" name="username" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Digite seu usuário" className="h-[54px] w-full rounded-xl border border-white/[.10] bg-[#09090d] px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 hover:border-white/20 focus:border-[#e83b50] focus:ring-4 focus:ring-[#e50914]/10"/>
              </div>
              <div>
                <label htmlFor="password" className="mb-2.5 block text-[11px] font-semibold tracking-wide text-zinc-300">SENHA</label>
                <div className="relative">
                  <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Digite sua senha" className="h-[54px] w-full rounded-xl border border-white/[.10] bg-[#09090d] px-4 pr-12 text-sm text-white outline-none transition placeholder:text-zinc-600 hover:border-white/20 focus:border-[#e83b50] focus:ring-4 focus:ring-[#e50914]/10"/>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-500 transition hover:text-white">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                </div>
              </div>
              {error && <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/[.08] px-4 py-3 text-[13px] leading-5 text-red-300">{error}</div>}
              <button type="submit" disabled={loading || !username.trim() || !password} className="group mt-2 flex h-[56px] w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#e51e37] to-[#b80e2b] text-[13px] font-bold tracking-wide text-white shadow-[0_10px_30px_#e5091430] transition hover:-translate-y-0.5 hover:shadow-[0_14px_38px_#e5091450] focus:outline-none focus:ring-4 focus:ring-[#e50914]/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0">
                {loading ? "Conectando..." : <>ACESSAR PLATAFORMA <ArrowRight size={17} className="transition group-hover:translate-x-1"/></>}
              </button>
            </form>

            <div className="mt-8 flex items-start gap-3 border-t border-white/[.08] pt-6">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-400"/>
              <p className="text-[11px] leading-5 text-zinc-500">Acesso protegido. Sua conta precisa estar ativa no servidor. Não existe cadastro público.</p>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-center gap-2 text-[10px] tracking-[.12em] text-zinc-600"><Layers3 size={13}/> EXPERIÊNCIA KAGEFLIX <span className="text-zinc-800">•</span> ACESSO SEGURO</div>
        </div>
      </section>

      <footer className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-2 border-t border-white/[.06] px-6 py-5 text-[9px] font-medium tracking-[.15em] text-zinc-600 sm:flex-row sm:px-10 lg:px-14">
        <span>© {new Date().getFullYear()} KAGEFLIX. TODOS OS DIREITOS RESERVADOS.</span><span>FEITO PARA QUEM AMA ANIME.</span>
      </footer>
    </main>
  );
}
