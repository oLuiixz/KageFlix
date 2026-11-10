"use client";

import Link from "next/link";
import { Compass, House, Settings } from "lucide-react";

type Props = { active: "home" | "browse" | "settings" };

export default function MobileNav({ active }: Props) {
  const links = [
    { id: "home" as const, href: "/inicio", label: "Início", Icon: House },
    { id: "browse" as const, href: "/iptv", label: "Explorar", Icon: Compass },
    { id: "settings" as const, href: "/configuracoes", label: "Ajustes", Icon: Settings },
  ];
  return (
    <nav className="kf-mobile-nav" aria-label="Navegação principal">
      {links.map(({ id, href, label, Icon }) => (
        <Link key={id} href={href} aria-current={active === id ? "page" : undefined}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
          <span className="nav-indicator" aria-hidden="true" />
        </Link>
      ))}
    </nav>
  );
}
