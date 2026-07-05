"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CircleHelp, Compass, Crown, DoorOpen, LogOut, Plus, Sparkles, Users } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useI18n } from "@/components/i18n-provider";
import OnboardingTour from "@/components/onboarding-tour";

type Room = {
  title: string;
  status: "voting" | "results";
  image_url: string | null;
  votes_cast: number;
  votes_total: number;
  href: string;
  role: "owner" | "guest";
  result_seen: boolean;
};

export default function Home() {
  const { t, error: translateError } = useI18n();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [rooms, setRooms] = useState<{ created: Room[]; invited: Room[] }>({ created: [], invited: [] });
  const [error, setError] = useState("");
  const [view, setView] = useState<"home" | "created" | "joined">("home");
  const [showTutorial, setShowTutorial] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
    if (!session) return;
    if (session.user.user_metadata.onboarding_completed !== true) setShowTutorial(true);
    const response = await fetch("/api/dashboard", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
    const json = await response.json();
    if (!response.ok) setError(translateError(json.error || "No se pudieron cargar las salas"));
    else setRooms(json);
  }, []);

  useEffect(() => {
    load();
    const updateView = () => setView(window.location.hash === "#created" ? "created" : window.location.hash === "#joined" ? "joined" : "home");
    updateView();
    window.addEventListener("hashchange", updateView);
    return () => window.removeEventListener("hashchange", updateView);
  }, [load]);

  async function logout() {
    await getSupabaseBrowser().auth.signOut();
    setRooms({ created: [], invited: [] });
    setUser(null);
  }

  async function completeTutorial() {
    setShowTutorial(false);
    await getSupabaseBrowser().auth.updateUser({ data: { onboarding_completed: true } });
  }

  if (user === undefined) return <div className="spinner" />;
  if (!user) return (
    <main className="shell">
      <div className="brand"><span className="brand-mark"><Crown size={18} /></span> Rate a Queen</div>
      <section className="hero landing-hero">
        <p className="eyebrow">The ranking game</p>
        <h1>{t("mayBest")}<br /><em>{t("win")}</em></h1>
        <p className="lede">{t("landingText")}</p>
        <div className="hero-actions"><a className="btn btn-dark" href="/auth?mode=signup"><Sparkles size={17} /> {t("signUp")}</a><a className="btn btn-soft" href="/auth">{t("signIn")}</a></div>
        <p className="guest-note"><DoorOpen size={15} /> {t("guestInvite")}</p>
      </section>
    </main>
  );

  return (
    <main className="shell wide">
      <div className="topbar"><a className="brand" href="/"><span className="brand-mark"><Crown size={18} /></span> Rate a Queen</a><div className="topbar-actions"><button className="icon-btn" onClick={() => setShowTutorial(true)} title={t("help")}><CircleHelp size={20} /></button><button className="icon-btn" onClick={logout} title={t("logout")}><LogOut size={19} /></button></div></div>
      <section className="dashboard-head">
        <div><p className="eyebrow">{t("yourDashboard")}</p><h2>{view === "created" ? t("createdByMe") : view === "joined" ? t("roomsIJoined") : t("myRooms")}</h2><p className="lede">{user.email}</p></div>
        <div className="dashboard-actions"><a className="btn btn-soft" href="/discover"><Compass size={17} /> {t("explorePublic")}</a><a className="btn btn-dark" href="/create"><Plus size={17} /> {t("newRoom")}</a></div>
      </section>
      {error && <div className="notice error">{error}</div>}
      {(view === "home" || view === "created") && <RoomSection title={t("createdByYou")} rooms={rooms.created} empty={t("noCreated")} />}
      {(view === "home" || view === "joined") && <RoomSection title={t("participating")} rooms={rooms.invited} empty={t("noJoined")} />}
      <OnboardingTour open={showTutorial} onComplete={completeTutorial} />
    </main>
  );
}

function RoomSection({ title, rooms, empty }: { title: string; rooms: Room[]; empty: string }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<"voting" | "results">("voting");
  const openRooms = rooms.filter((room) => room.status === "voting");
  const closedRooms = rooms.filter((room) => room.status === "results");
  const unseen = closedRooms.filter((room) => !room.result_seen).length;
  useEffect(() => {
    if (rooms.length && !openRooms.length && closedRooms.length) setStatus("results");
  }, [rooms.length, openRooms.length, closedRooms.length]);
  const visibleRooms = status === "voting" ? openRooms : closedRooms;
  return <section className="room-section">
    <div className="section-title"><h3>{title}</h3><span className="count">{t("roomsCount", { count: rooms.length })}</span></div>
    {rooms.length === 0 ? <div className="empty-state">{empty}</div> : <><div className="status-tabs"><button className={status === "voting" ? "active" : ""} onClick={() => setStatus("voting")}>{t("open")} <span>{openRooms.length}</span></button><button className={status === "results" ? "active" : ""} onClick={() => setStatus("results")}>{t("results")} <span>{closedRooms.length}</span>{unseen > 0 && <b>{unseen}</b>}</button></div>
    {visibleRooms.length === 0 ? <div className="empty-state compact">{status === "voting" ? t("noOpen") : t("noResults")}</div> : <div className="room-grid">{visibleRooms.map((room) => (
      <a className="room-card" href={room.href} key={room.href}>
        {room.image_url ? <img src={room.image_url} alt="" /> : <div className="room-placeholder"><Crown /></div>}
        <div className="room-body"><span className={`room-status ${room.status}`}>{room.status === "results" ? t("results") : t("votingOpen")}</span><h3>{room.title}</h3><p><Users size={14} /> {room.votes_cast}/{room.votes_total}</p></div>
        <ArrowRight className="room-arrow" size={19} />
        {!room.result_seen && room.status === "results" && <span className="new-result-dot" aria-label={t("newResult")} />}
      </a>
    ))}</div>}</>}
  </section>;
}
