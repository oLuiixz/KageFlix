import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export const runtime = "nodejs";

export async function POST() {
  const secret = process.env.AUTH_SECRET;
  const token = (await cookies()).get("kageflix_session")?.value;
  if (!secret || !token) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    if (payload.role !== "admin") return NextResponse.json({ error: "Apenas administradores." }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  return NextResponse.json({
    error: "A importação permanente foi desativada. O KageFlix agora consulta o catálogo Xtream sob demanda e não grava títulos no Neon."
  }, { status: 410 });
}
