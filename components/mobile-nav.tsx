"use client";

import { useEffect, useState } from "react";
import { Compass, House, PlusSquare, UsersRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useI18n } from "@/components/i18n-provider";

type Tab = "home" | "created" | "joined" | "discover";

export default function MobileNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const [badges, setBadges] = useState({ created: 0, joined: 0 });

  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  useEffect(() => {
    const loadBadges = async () => {
      const { data: { session } } = await getSupabaseBrowser().auth.getSession();
      if (!session) return setBadges({ created: 0, joined: 0 });
      const response = await fetch("/api/dashboard/notifications", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      if (response.ok) setBadges(await response.json());
    };
    loadBadges();
    window.addEventListener("result-viewed", loadBadges);
    return () => window.removeEventListener("result-viewed", loadBadges);
  }, [pathname, hash]);

  if (pathname === "/auth") return null;
  const active: Tab = pathname === "/discover" ? "discover" : pathname === "/" && hash === "#created" ? "created" : pathname === "/" && hash === "#joined" ? "joined" : pathname === "/" ? "home" : "home";
  const items: { tab: Tab; href: string; label: string; icon: typeof House }[] = [
    { tab: "home", href: "/", label: t("home"), icon: House },
    { tab: "created", href: "/#created", label: t("created"), icon: PlusSquare },
    { tab: "joined", href: "/#joined", label: t("joined"), icon: UsersRound },
    { tab: "discover", href: "/discover", label: t("discover"), icon: Compass },
  ];

  return <nav className="mobile-nav" aria-label={t("navLabel")}>{items.map((item) => {
    const Icon = item.icon;
    const badge = item.tab === "created" ? badges.created : item.tab === "joined" ? badges.joined : 0;
    return <a key={item.tab} href={item.href} className={active === item.tab ? "active" : ""}><span className="nav-icon"><Icon size={21} />{badge > 0 && <b>{badge > 99 ? "99+" : badge}</b>}</span><span>{item.label}</span></a>;
  })}</nav>;
}
