import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";

export const runtime = "nodejs";

export default async function AdminCatalogPage() {
  const token = (await cookies()).get("kageflix_session")?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) redirect("/");
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    if (payload.role !== "admin") redirect("/inicio");
  } catch { redirect("/"); }
  redirect("/admin/clientes");
}
