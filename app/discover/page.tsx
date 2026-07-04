"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Crown, Search, Users } from "lucide-react";
import SiteHeader from "@/components/site-header";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useI18n } from "@/components/i18n-provider";

type PublicRoom = { title: string; status: "voting" | "results"; image_url: string | null; votes_cast: number; members: number; joined: boolean; href: string };

export default function DiscoverPage() {
  const { t, error: translateError } = useI18n();
  const [query, setQuery] = useState("");
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function search(event?: FormEvent) {
    event?.preventDefault(); setLoading(true); setError("");
    const { data: { session } } = await getSupabaseBrowser().auth.getSession();
    if (!session) return void (window.location.href = "/auth?next=/discover");
    const response = await fetch(`/api/public-rooms?q=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
    const json = await response.json();
    if (!response.ok) setError(translateError(json.error || "No se pudieron buscar las salas")); else setRooms(json);
    setLoading(false);
  }
  useEffect(() => { search(); }, []);

  return <main className="shell wide"><SiteHeader />
    <section className="dashboard-head"><div><p className="eyebrow">{t("exploreTag")}</p><h2>{t("publicOpenRooms")}</h2><p className="lede">{t("exploreLead")}</p></div></section>
    <form className="search-bar" onSubmit={search}><Search size={19} /><input placeholder={t("searchPlaceholder")} value={query} onChange={(event) => setQuery(event.target.value)} /><button className="btn btn-dark">{t("search")}</button></form>
    {error && <div className="notice error">{error}</div>}
    {loading ? <div className="spinner" /> : rooms.length === 0 ? <div className="empty-state">{t("noPublicRooms")}</div> : <div className="room-grid discover-grid">{rooms.map((room) => <a className="room-card" href={room.href} key={room.href}>
      {room.image_url ? <img src={room.image_url} alt="" /> : <div className="room-placeholder"><Crown /></div>}
      <div className="room-body"><span className={`room-status ${room.status}`}>{room.joined ? t("member") : t("open")}</span><h3>{room.title}</h3><p><Users size={14} /> {t("membersVotes", { members: room.members, votes: room.votes_cast })}</p></div><ArrowRight className="room-arrow" size={19} />
    </a>)}</div>}
  </main>;
}
