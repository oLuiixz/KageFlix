import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "KageFlix | Filmes, séries e TV ao vivo", description: "Filmes, séries e canais ao vivo em uma experiência de streaming.", applicationName: "KageFlix" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
