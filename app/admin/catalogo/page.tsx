import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";

export const runtime = "nodejs";

export default async function AdminCatalogPage() {
  const token = (await cookies()).get("kageflix_session")?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) redirect("/");
  let isAdmin = false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    isAdmin = payload.role === "admin";
  } catch { redirect("/"); }
  if (!isAdmin) redirect("/inicio");
  redirect("/admin/clientes");
}
