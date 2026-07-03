"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Crown, DoorOpen, LogOut, Plus, Sparkles, Users } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type Room = {
  title: string;
  status: "voting" | "results";
  image_url: string | null;
  votes_cast: number;
  votes_total: number;
  href: string;
  role: "owner" | "guest";
};

export default function Home() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [rooms, setRooms] = useState<{ created: Room[]; invited: Room[] }>({ created: [], invited: [] });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
    if (!session) return;
    const response = await fetch("/api/dashboard", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
    const json = await response.json();
    if (!response.ok) setError(json.error || "No se pudieron cargar las salas");
    else setRooms(json);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function logout() {
    await getSupabaseBrowser().auth.signOut();
    setRooms({ created: [], invited: [] });
    setUser(null);
  }

  if (user === undefined) return <div className="spinner" />;
  if (!user) return (
    <main className="shell">
      <div className="brand"><span className="brand-mark"><Crown size={18} /></span> Rate a Queen</div>
      <section className="hero landing-hero">
        <p className="eyebrow">The ranking game</p>
        <h1>Que gane<br /><em>la mejor.</em></h1>
        <p className="lede">Crea rankings privados, invita mediante enlaces únicos y descubre el resultado cuando todo el grupo haya votado.</p>
        <div className="hero-actions"><a className="btn btn-dark" href="/auth?mode=signup"><Sparkles size={17} /> Crear una cuenta</a><a className="btn btn-soft" href="/auth">Iniciar sesión</a></div>
        <p className="guest-note"><DoorOpen size={15} /> ¿Te han invitado? No necesitas registrarte: abre directamente el enlace que has recibido.</p>
      </section>
    </main>
  );

  return (
    <main className="shell wide">
      <div className="topbar"><a className="brand" href="/"><span className="brand-mark"><Crown size={18} /></span> Rate a Queen</a><button className="icon-btn" onClick={logout} title="Cerrar sesión"><LogOut size={19} /></button></div>
      <section className="dashboard-head">
        <div><p className="eyebrow">Tu panel</p><h2>Mis salas</h2><p className="lede">{user.email}</p></div>
        <a className="btn btn-dark" href="/create"><Plus size={17} /> Nueva sala</a>
      </section>
      {error && <div className="notice error">{error}</div>}
      <RoomSection title="Creadas por ti" rooms={rooms.created} empty="Todavía no has creado ninguna sala." />
      <RoomSection title="Te han invitado" rooms={rooms.invited} empty="Las invitaciones que abras con tu sesión iniciada aparecerán aquí." />
    </main>
  );
}

function RoomSection({ title, rooms, empty }: { title: string; rooms: Room[]; empty: string }) {
  return <section className="room-section">
    <div className="section-title"><h3>{title}</h3><span className="count">{rooms.length} salas</span></div>
    {rooms.length === 0 ? <div className="empty-state">{empty}</div> : <div className="room-grid">{rooms.map((room) => (
      <a className="room-card" href={room.href} key={room.href}>
        {room.image_url ? <img src={room.image_url} alt="" /> : <div className="room-placeholder"><Crown /></div>}
        <div className="room-body"><span className={`room-status ${room.status}`}>{room.status === "results" ? "Resultados" : "Votación abierta"}</span><h3>{room.title}</h3><p><Users size={14} /> {room.votes_cast} de {room.votes_total} votos</p></div>
        <ArrowRight className="room-arrow" size={19} />
      </a>
    ))}</div>}
  </section>;
}
