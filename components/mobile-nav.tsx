"use client";

import { useEffect, useState } from "react";
import { Compass, House, PlusSquare, UsersRound } from "lucide-react";
import { usePathname } from "next/navigation";

type Tab = "home" | "created" | "joined" | "discover";

export default function MobileNav() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  if (pathname === "/auth") return null;
  const active: Tab = pathname === "/discover" ? "discover" : pathname === "/" && hash === "#created" ? "created" : pathname === "/" && hash === "#joined" ? "joined" : pathname === "/" ? "home" : "home";
  const items: { tab: Tab; href: string; label: string; icon: typeof House }[] = [
    { tab: "home", href: "/", label: "Inicio", icon: House },
    { tab: "created", href: "/#created", label: "Creadas", icon: PlusSquare },
    { tab: "joined", href: "/#joined", label: "Participo", icon: UsersRound },
    { tab: "discover", href: "/discover", label: "Explorar", icon: Compass },
  ];

  return <nav className="mobile-nav" aria-label="Navegación principal">{items.map((item) => {
    const Icon = item.icon;
    return <a key={item.tab} href={item.href} className={active === item.tab ? "active" : ""}><Icon size={21} /><span>{item.label}</span></a>;
  })}</nav>;
}
