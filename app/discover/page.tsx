"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Crown, Search, Users } from "lucide-react";
import SiteHeader from "@/components/site-header";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type PublicRoom = { title: string; status: "voting" | "results"; image_url: string | null; votes_cast: number; members: number; joined: boolean; href: string };

export default function DiscoverPage() {
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
    if (!response.ok) setError(json.error || "No se pudieron buscar las salas"); else setRooms(json);
    setLoading(false);
  }
  useEffect(() => { search(); }, []);

  return <main className="shell wide"><SiteHeader />
    <section className="dashboard-head"><div><p className="eyebrow">Explorar</p><h2>Salas públicas</h2><p className="lede">Encuentra rankings abiertos y únete con tu cuenta.</p></div></section>
    <form className="search-bar" onSubmit={search}><Search size={19} /><input placeholder="Buscar por nombre…" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="btn btn-dark">Buscar</button></form>
    {error && <div className="notice error">{error}</div>}
    {loading ? <div className="spinner" /> : rooms.length === 0 ? <div className="empty-state">No hay salas públicas que coincidan.</div> : <div className="room-grid discover-grid">{rooms.map((room) => <a className="room-card" href={room.href} key={room.href}>
      {room.image_url ? <img src={room.image_url} alt="" /> : <div className="room-placeholder"><Crown /></div>}
      <div className="room-body"><span className={`room-status ${room.status}`}>{room.joined ? "Miembro" : room.status === "results" ? "Cerrada" : "Abierta"}</span><h3>{room.title}</h3><p><Users size={14} /> {room.members} miembros · {room.votes_cast} votos</p></div><ArrowRight className="room-arrow" size={19} />
    </a>)}</div>}
  </main>;
}
