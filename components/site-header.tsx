"use client";

import { Crown, House } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

export default function SiteHeader() {
  const { t } = useI18n();
  return (
    <div className="topbar">
      <a className="brand" href="/"><span className="brand-mark"><Crown size={18} /></span> Rate a Queen</a>
      <a className="btn btn-soft desktop-home-link" href="/"><House size={15} /> {t("home")}</a>
    </div>
  );
}
