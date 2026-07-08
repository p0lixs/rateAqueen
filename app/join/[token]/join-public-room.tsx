"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Crown, LogIn, Users } from "lucide-react";
import SiteHeader from "@/components/site-header";
import { deviceHeaders, rememberDevice } from "@/lib/device-browser";
import { useI18n } from "@/components/i18n-provider";
import { API_ERROR } from "@/lib/api-errors";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { usernameFromUser } from "@/lib/user";

type RoomData = { title: string; description: string | null; owner_name: string | null; status: "registration" | "voting" | "results"; image_url: string | null; members: number; votes_cast: number; membership: { token: string; has_voted: boolean } | null };

export default function JoinPublicRoom({ token }: { token: string }) {
  const { t, error: translateError } = useI18n();
  const [data, setData] = useState<RoomData | null>(null);
  const [name, setName] = useState("");
  const [accountName, setAccountName] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const { data: { session } } = await getSupabaseBrowser().auth.getSession();
    setAccountName(session ? usernameFromUser(session.user) : null);
    const response = await fetch(`/api/public-rooms/${token}`, { headers: { ...deviceHeaders(), ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) }, cache: "no-store" });
    rememberDevice(response);
    const json = await response.json();
    if (!response.ok) setError(translateError(json.error || API_ERROR.ROOM_OPEN_FAILED)); else setData(json);
  }, [token, translateError]);
  useEffect(() => { load(); }, [load]);

  async function join(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    const { data: { session } } = await getSupabaseBrowser().auth.getSession();
    const response = await fetch(`/api/public-rooms/${token}`, { method: "POST", headers: { "Content-Type": "application/json", ...deviceHeaders(), ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify(accountName ? {} : { name }) });
    rememberDevice(response);
    const json = await response.json();
    if (!response.ok) { setError(translateError(json.error || API_ERROR.ROOM_JOIN_FAILED)); setLoading(false); return; }
    window.location.href = `/vote/${json.token}`;
  }
  if (error && !data) return <main className="shell"><SiteHeader /><div className="notice error">{error}</div></main>;
  if (!data || accountName === undefined) return <div className="spinner" />;
  if (data.membership) return <main className="shell"><SiteHeader /><section className="join-card card center">{data.image_url ? <img src={data.image_url} alt="" /> : <span className="join-image"><Crown /></span>}<p className="eyebrow">{t("alreadyMember")}</p><h2>{data.title}</h2><p>{t("organizedBy", { name: data.owner_name || t("unknownOrganizer") })}</p><a className="btn btn-primary" href={data.status === "results" ? `/results/${data.membership.token}` : `/vote/${data.membership.token}`}>{data.status === "results" ? t("viewResults") : data.membership.has_voted ? t("viewStatus") : t("goVote")}</a></section></main>;
  return <main className="shell"><SiteHeader /><section className="join-card card center">{data.image_url ? <img src={data.image_url} alt="" /> : <span className="join-image"><Crown /></span>}<p className="eyebrow">{t("publicRoomTag")}</p><h2>{data.title}</h2>{data.description && <p className="room-description">{data.description}</p>}<p>{t("organizedBy", { name: data.owner_name || t("unknownOrganizer") })}</p><p className="lede"><Users size={15} /> {t("membersVotes", { members: data.members, votes: data.votes_cast })}</p>{data.status === "results" ? <div className="notice">{t("closedNoMembers")}</div> : <form onSubmit={join}>{accountName ? <p className="notice">{t("joiningAs", { name: accountName })}</p> : <div className="field"><label>{t("name")}</label><input className="input" value={name} onChange={(event) => setName(event.target.value)} required maxLength={60} /></div>}{error && <div className="notice error">{error}</div>}<button className="btn btn-primary" disabled={loading}><LogIn size={17} /> {loading ? t("joining") : data.status === "registration" ? t("joinRoom") : t("joinVote")}</button></form>}</section></main>;
}
