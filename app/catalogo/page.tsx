"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LoaderCircle, Tv2 } from "lucide-react";

export default function CatalogPage() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") === "series" ? "series" : "vod";
  const categoryId = type === "series" ? "all-anime" : "all-movies";

  useEffect(() => {
    window.location.replace(`/explorar/${type}/${categoryId}`);
  }, [type, categoryId]);

  return (
    <main className="kf-app flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-zinc-400">
        <LoaderCircle className="animate-spin text-red-500" size={20} />
        <span>Preparando sua biblioteca...</span>
      </div>
    </main>
  );
}
