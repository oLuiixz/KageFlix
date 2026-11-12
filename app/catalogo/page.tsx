"use client";

import Link from "next/link";
import { Clapperboard, Tv2, ArrowRight } from "lucide-react";
import MobileNav from "@/components/mobile-nav";

export default function CatalogPage() {
  return (
    <main className="kf-app min-h-screen overflow-x-hidden">
      <header className="kf-header">
        <div className="mx-auto flex h-[72px] w-full max-w-[1500px] items-center px-3 sm:px-8 lg:px-12">
          <Link href="/inicio" className="kf-brand min-w-0 shrink-0 gap-2 text-[14px] sm:gap-[10px] sm:text-[18px]">
            <span className="inline-flex h-8 w-7 items-center justify-center">
              <img src="/kageflix-logo.svg" alt="" className="h-8 w-auto object-contain" />
            </span>
            <span>KAGE<span className="text-[#ed1722]">FLIX</span></span>
          </Link>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100svh-150px)] w-full max-w-[1100px] flex-col justify-center px-5 py-14 sm:px-8 lg:px-12">
        <div className="mb-8 text-center">
          <p className="kf-kicker mb-3">SUA PRÓXIMA MARATONA COMEÇA AQUI</p>
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">O que você quer assistir?</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">Escolha uma categoria para explorar nosso catálogo.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
          <Link href="/explorar/vod/all-movies" className="group relative isolate flex min-h-[230px] items-end overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 p-6 transition hover:border-red-500/50 sm:min-h-[310px] sm:p-9">
            <img src="https://d1uzk9o9cg136f.cloudfront.net/f/16783497/rc/2020/07/01/5cfcab543bed267ef25794b747e99b6e251c40b3_xlarge.jpg" alt="" className="absolute inset-0 -z-20 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/55 to-black/10" />
            <div>
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-black/30 text-white"><Clapperboard size={21} /></span>
              <h2 className="text-3xl font-black">Filmes</h2>
              <p className="mt-2 text-sm text-white/75">Encontre seu próximo filme favorito.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold">Explorar filmes <ArrowRight size={16} /></span>
            </div>
          </Link>

          <Link href="/explorar/series/all-anime" className="group relative isolate flex min-h-[230px] items-end overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 p-6 transition hover:border-red-500/50 sm:min-h-[310px] sm:p-9">
            <img src="https://www.aniplex.co.jp/SYS/CONTENTS/keyvisual_kimetsu_worldtour/w700" alt="" className="absolute inset-0 -z-20 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/55 to-black/10" />
            <div>
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-black/30 text-white"><Tv2 size={21} /></span>
              <h2 className="text-3xl font-black">Séries</h2>
              <p className="mt-2 text-sm text-white/75">Explore suas séries e animes favoritos.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold">Explorar séries <ArrowRight size={16} /></span>
            </div>
          </Link>
        </div>
      </section>

      <MobileNav active="browse" />
    </main>
  );
}
