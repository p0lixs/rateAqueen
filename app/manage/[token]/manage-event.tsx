"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Crown, ExternalLink, RefreshCw } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type AdminData = {
  title: string;
  status: "voting" | "results";
  invitations: { name: string; nickname: string; token: string; has_voted: boolean }[];
};

export default function ManageEvent({ token }: { token: string }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    const { data: { session } } = await getSupabaseBrowser().auth.getSession();
    const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
    const response = await fetch(`/api/manage/${token}`, { cache: "no-store", headers });
    const json = await response.json();
    if (!response.ok) return setError(json.error || "No se pudo abrir la partida");
    setData(json);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function copyLink(invitationToken: string) {
    const link = `${window.location.origin}/vote/${invitationToken}`;
    await navigator.clipboard.writeText(link);
    setCopied(invitationToken);
    setTimeout(() => setCopied(""), 1500);
  }

  if (error) return <main className="shell"><div className="notice error">{error}</div></main>;
  if (!data) return <div className="spinner" />;
  const cast = data.invitations.filter((item) => item.has_voted).length;

  return (
    <main className="shell">
      <div className="brand"><span className="brand-mark"><Crown size={18} /></span> Rate a Queen</div>
      <section className="hero">
        <p className="eyebrow">Panel de organizadora</p>
        <h2>{data.title}</h2>
        <p className="lede">Comparte cada enlace con su persona. El enlace permite votar una sola vez y no queda asociado a la papeleta.</p>
      </section>
      <div className="stat-grid">
        <div className="stat"><strong>{cast}/{data.invitations.length}</strong><span>votos recibidos</span></div>
        <div className="stat"><strong>{data.status === "results" ? "Publicado" : "Abierto"}</strong><span>estado</span></div>
      </div>
      {data.status === "results" && <a className="btn btn-primary" href={`/results/${token}`}><ExternalLink size={17} /> Ver clasificación final</a>}

      <section className="card">
        <div className="section-title"><h3>Enlaces personales</h3><button className="icon-btn" onClick={load} aria-label="Actualizar"><RefreshCw size={17} /></button></div>
        {data.invitations.map((invitation) => (
          <div className="invite" key={invitation.token}>
            <div><strong>{invitation.nickname}</strong><small>{invitation.name} · <span className={`status-dot ${invitation.has_voted ? "done" : ""}`} />{invitation.has_voted ? "Ya ha votado" : "Pendiente"}</small></div>
            <button className="btn btn-soft" onClick={() => copyLink(invitation.token)}>{copied === invitation.token ? <Check size={15} /> : <Copy size={15} />} {copied === invitation.token ? "Copiado" : "Copiar"}</button>
          </div>
        ))}
      </section>
      <p className="privacy">Guarda esta página: es tu enlace privado de administración. No lo compartas con las participantes.</p>
    </main>
  );
}
