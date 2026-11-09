import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "KageFlix | Seu universo de animes", description: "Uma experiência premium para explorar seu universo de animes.", applicationName: "KageFlix" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
