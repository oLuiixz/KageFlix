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

    // Xtream providers commonly redirect media requests to a CDN or a dedicated
    // streaming host. Follow those redirects instead of turning them into fetch failures.
    const upstream = await fetch(upstreamUrl, {
      headers,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(55000),
    });

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
    const err = error instanceof Error ? error : new Error("Unknown stream proxy error");
    const cause = err.cause as { code?: string; message?: string } | undefined;
    // Keep credentials and upstream URLs out of logs and client responses.
    console.error("KageFlix stream proxy error:", {
      name: err.name,
      message: err.message,
      causeCode: cause?.code,
      causeMessage: cause?.message,
    });
    const unauthorized = /sessão|autenticad/i.test(err.message);
    return NextResponse.json(
      { error: unauthorized ? "Sua sessão expirou. Entre novamente." : "O servidor IPTV não conseguiu entregar este vídeo. Tente novamente." },
      { status: unauthorized ? 401 : 502 },
    );
  }
}
