import type { Metadata, Viewport } from "next";
import PwaRegister from "./pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "KageFlix | Filmes, séries e TV ao vivo",
  description: "Filmes, séries e animes em uma experiência de streaming.",
  applicationName: "KageFlix",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KageFlix",
  },
};

export const viewport: Viewport = {
  themeColor: "#070707",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
