"use client";

import { useEffect, useRef, useState } from "react";
import { CircleHelp, EllipsisVertical, House, Languages, LogOut } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useI18n } from "@/components/i18n-provider";
import type { LanguagePreference } from "@/components/i18n-provider";

export default function AppMenu({ onHelp }: { onHelp?: () => void }) {
  const { preference, setPreference, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSupabaseBrowser().auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  async function logout() {
    await getSupabaseBrowser().auth.signOut();
    window.location.href = "/";
  }

  return <div className="app-menu" ref={root}>
    <button className="icon-btn app-menu-trigger" aria-label={t("menu")} aria-expanded={open} onClick={() => setOpen((current) => !current)}><EllipsisVertical size={21} /></button>
    {open && <div className="app-menu-popover">
      <a href="/"><House size={16} /> {t("home")}</a>
      {onHelp && <button onClick={() => { setOpen(false); onHelp(); }}><CircleHelp size={16} /> {t("help")}</button>}
      <label><Languages size={16} /><span>{t("language")}</span><select value={preference} onChange={(event) => setPreference(event.target.value as LanguagePreference)}><option value="auto">{t("languageAuto")}</option><option value="es">ES</option><option value="en">EN</option></select></label>
      {signedIn && <button className="menu-logout" onClick={logout}><LogOut size={16} /> {t("logout")}</button>}
    </div>}
  </div>;
}
