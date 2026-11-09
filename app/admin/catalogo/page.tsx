import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import CatalogImportPanel from "./panel";

export const runtime = "nodejs";

export default async function AdminCatalogPage() {
  const token = (await cookies()).get("kageflix_session")?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) redirect("/");
  let role: unknown;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    role = payload.role;
  } catch {
    redirect("/");
  }
  if (role !== "admin") redirect("/inicio");
  return <CatalogImportPanel />;
}
