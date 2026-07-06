"use client";

import { Crown } from "lucide-react";
import AppMenu from "@/components/app-menu";

export default function SiteHeader() {
  return (
    <div className="topbar">
      <a className="brand" href="/"><span className="brand-mark"><Crown size={18} /></span> Rate a Queen</a>
      <AppMenu />
    </div>
  );
}
