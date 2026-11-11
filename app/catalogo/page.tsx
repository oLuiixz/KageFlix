"use client";

import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";

export default function CatalogPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type") === "series" ? "series" : "vod";
    const categoryId = type === "series" ? "all-anime" : "all-movies";
    window.location.replace(`/explorar/${type}/${categoryId}`);
  }, []);

  return (
    <main className="kf-app flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-zinc-400">
        <LoaderCircle className="animate-spin text-red-500" size={20} />
        <span>Preparando sua biblioteca...</span>
      </div>
    </main>
  );
}
