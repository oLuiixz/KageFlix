import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { LogOut, Play, Search, Tv2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const token = (await cookies()).get("kageflix_session")?.value;
  if (!token || !process.env.AUTH_SECRET) redirect("/");

  let displayName = "Otaku";
  try {
    const verified = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
    displayName = typeof verified.payload.displayName === "string" ? verified.payload.displayName : displayName;
  } catch {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3"><span className="brand-mark"><Tv2 size={20}/></span><span className="text-xl font-black tracking-[.12em]">KAGE<span className="text-[#E50914]">FLIX</span></span></div>
        <div className="flex items-center gap-4"><span className="hidden text-sm text-zinc-400 sm:inline">Olá, {displayName}</span><form action="/api/auth/logout" method="post"><button className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:border-red-500/50 hover:text-white"><LogOut size={15}/> Sair</button></form></div>
      </header>
      <section className="relative overflow-hidden px-6 py-24 sm:px-12 lg:px-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_40%,rgba(150,0,10,.25),transparent_50%)]"/>
        <div className="relative max-w-2xl">
          <p className="mb-4 text-xs font-bold tracking-[.24em] text-[#f0444c]">BEM-VINDO À KAGEFLIX</p>
          <h1 className="text-5xl font-black tracking-tight sm:text-7xl">Sua próxima<br/><span className="text-[#E50914]">aventura</span> começa.</h1>
          <p className="mt-6 max-w-lg leading-7 text-zinc-400">Seu acesso foi validado. Estamos preparando seu catálogo de animes.</p>
          <button className="mt-9 inline-flex items-center gap-3 rounded-lg bg-[#E50914] px-6 py-4 text-sm font-bold shadow-[0_12px_35px_rgba(229,9,20,.2)]"><Play size={17} fill="currentColor"/> Explorar em breve</button>
        </div>
      </section>
      <section className="px-6 pb-20 sm:px-12 lg:px-20"><div className="flex items-center gap-3 text-zinc-500"><Search size={17}/><p className="text-sm">Catálogo em preparação. Em breve, novos universos estarão esperando por você.</p></div></section>
    </main>
  );
}
