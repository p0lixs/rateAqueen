"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Crown, LogIn, Users } from "lucide-react";
import SiteHeader from "@/components/site-header";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type RoomData = { title: string; status: "voting" | "results"; image_url: string | null; members: number; votes_cast: number; membership: { token: string; has_voted: boolean } | null };

export default function JoinPublicRoom({ token }: { token: string }) {
  const [data, setData] = useState<RoomData | null>(null);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const { data: { session } } = await getSupabaseBrowser().auth.getSession();
    if (!session) return void (window.location.href = `/auth?next=${encodeURIComponent(`/join/${token}`)}`);
    setAccessToken(session.access_token);
    setName(session.user.email?.split("@")[0] || "");
    const response = await fetch(`/api/public-rooms/${token}`, { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
    const json = await response.json();
    if (!response.ok) setError(json.error || "No se pudo abrir la sala"); else setData(json);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  async function join(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch(`/api/public-rooms/${token}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ name, nickname }) });
    const json = await response.json();
    if (!response.ok) { setError(json.error || "No se pudo completar la unión"); setLoading(false); return; }
    window.location.href = `/vote/${json.token}`;
  }
  if (error && !data) return <main className="shell"><SiteHeader /><div className="notice error">{error}</div></main>;
  if (!data) return <div className="spinner" />;
  if (data.membership) return <main className="shell"><SiteHeader /><section className="join-card card center">{data.image_url ? <img src={data.image_url} alt="" /> : <span className="join-image"><Crown /></span>}<p className="eyebrow">Ya eres miembro</p><h2>{data.title}</h2><a className="btn btn-primary" href={data.status === "results" ? `/results/${data.membership.token}` : `/vote/${data.membership.token}`}>{data.status === "results" ? "Ver resultados" : data.membership.has_voted ? "Ver estado" : "Ir a votar"}</a></section></main>;
  return <main className="shell"><SiteHeader /><section className="join-card card center">{data.image_url ? <img src={data.image_url} alt="" /> : <span className="join-image"><Crown /></span>}<p className="eyebrow">Sala pública</p><h2>{data.title}</h2><p className="lede"><Users size={15} /> {data.members} miembros · {data.votes_cast} votos</p>{data.status === "results" ? <div className="notice">Esta sala ya está cerrada y no admite miembros nuevos.</div> : <form onSubmit={join}><div className="field"><label>Nombre</label><input className="input" value={name} onChange={(event) => setName(event.target.value)} required maxLength={60} /></div><div className="field"><label>Apodo visible para la administradora</label><input className="input" value={nickname} onChange={(event) => setNickname(event.target.value)} required maxLength={60} /></div>{error && <div className="notice error">{error}</div>}<button className="btn btn-primary" disabled={loading}><LogIn size={17} /> {loading ? "Uniéndome…" : "Unirme y votar"}</button></form>}</section></main>;
}
