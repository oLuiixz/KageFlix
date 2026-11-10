import { NextResponse } from "next/server";
import { getXtreamContext } from "@/lib/xtream";

export const runtime = "nodejs";
export const maxDuration = 60;

type Context = { params: Promise<{ kind: string; id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { kind, id } = await context.params;
    const params = new URL(request.url).searchParams;
    const extension = (params.get("ext") || (kind === "live" ? "ts" : "mp4")).toLowerCase();
    if (!["live", "movie", "series"].includes(kind) || !/^\d+$/.test(id) || !/^(ts|m3u8|mp4|mkv|avi|mov|webm)$/.test(extension)) {
      return NextResponse.json({ error: "Endereço de reprodução inválido." }, { status: 400 });
    }
    const { username, password } = await getXtreamContext();
    const upstreamUrl = new URL(`/${kind}/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${id}.${extension}`, "http://xmrs2.top");
    const headers = new Headers();
    const range = request.headers.get("range");
    if (range) headers.set("Range", range);
    const upstream = await fetch(upstreamUrl, { headers, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(55000) });
    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json({ error: `Não foi possível iniciar a reprodução (HTTP ${upstream.status}).` }, { status: 502 });
    }
    const responseHeaders = new Headers();
    for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "last-modified"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set("Cache-Control", "private, no-store");
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao iniciar reprodução.";
    console.error("KageFlix stream proxy error:", message);
    return NextResponse.json({ error: message }, { status: message.includes("Sessão") ? 401 : 502 });
  }
}
