"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, ExternalLink, LockKeyhole, Plus, RefreshCw } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import SiteHeader from "@/components/site-header";

type AdminData = {
  title: string;
  status: "voting" | "results";
  invitations: { name: string; nickname: string; token: string; has_voted: boolean }[];
};

export default function ManageEvent({ token }: { token: string }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [newName, setNewName] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

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

  async function addParticipant(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setActionError("");
    const response = await fetch(`/api/manage/${token}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, nickname: newNickname }),
    });
    const json = await response.json();
    if (!response.ok) setActionError(json.error || "No se pudo añadir la participante");
    else { setNewName(""); setNewNickname(""); await load(); }
    setBusy(false);
  }

  async function closeVoting() {
    if (!confirm("¿Cerrar la votación y publicar la clasificación? Después no podrás añadir participantes ni recibir más votos.")) return;
    setBusy(true); setActionError("");
    const response = await fetch(`/api/manage/${token}`, { method: "POST" });
    const json = await response.json();
    if (!response.ok) setActionError(json.error || "No se pudo cerrar la votación");
    else await load();
    setBusy(false);
  }

  if (error) return <main className="shell"><SiteHeader /><div className="notice error">{error}</div></main>;
  if (!data) return <div className="spinner" />;
  const cast = data.invitations.filter((item) => item.has_voted).length;

  return (
    <main className="shell">
      <SiteHeader />
      <section className="hero">
        <p className="eyebrow">Panel de organizadora</p>
        <h2>{data.title}</h2>
        <p className="lede">Comparte cada enlace con su persona y añade nuevas participantes mientras la sala siga abierta. Tú decides cuándo cerrar y publicar el resultado.</p>
      </section>
      <div className="stat-grid">
        <div className="stat"><strong>{cast}/{data.invitations.length}</strong><span>votos recibidos</span></div>
        <div className="stat"><strong>{data.status === "results" ? "Publicado" : "Abierto"}</strong><span>estado</span></div>
      </div>
      {data.status === "results" && <a className="btn btn-primary" href={`/results/${token}`}><ExternalLink size={17} /> Ver clasificación final</a>}

      {data.status === "voting" && <section className="card add-participant-card">
        <div className="section-title"><h3>Añadir participante</h3><span className="count">La sala seguirá abierta</span></div>
        <form className="add-participant" onSubmit={addParticipant}>
          <input className="input" placeholder="Nombre" value={newName} onChange={(event) => setNewName(event.target.value)} required maxLength={60} />
          <input className="input" placeholder="Apodo" value={newNickname} onChange={(event) => setNewNickname(event.target.value)} required maxLength={60} />
          <button className="btn btn-soft" disabled={busy}><Plus size={16} /> Añadir</button>
        </form>
      </section>}

      <section className="card">
        <div className="section-title"><h3>Enlaces personales</h3><button className="icon-btn" onClick={load} aria-label="Actualizar"><RefreshCw size={17} /></button></div>
        {data.invitations.map((invitation) => (
          <div className="invite" key={invitation.token}>
            <div><strong>{invitation.nickname}</strong><small>{invitation.name} · <span className={`status-dot ${invitation.has_voted ? "done" : ""}`} />{invitation.has_voted ? "Ya ha votado" : "Pendiente"}</small></div>
            <button className="btn btn-soft" onClick={() => copyLink(invitation.token)}>{copied === invitation.token ? <Check size={15} /> : <Copy size={15} />} {copied === invitation.token ? "Copiado" : "Copiar"}</button>
          </div>
        ))}
      </section>
      {actionError && <div className="notice error">{actionError}</div>}
      {data.status === "voting" && <section className="close-panel">
        <div><strong>Cerrar y publicar</strong><p>La clasificación se calculará con los votos recibidos hasta ese momento.</p></div>
        <button className="btn btn-danger" onClick={closeVoting} disabled={busy}><LockKeyhole size={16} /> Cerrar votación</button>
      </section>}
      <p className="privacy">Guarda esta página: es tu enlace privado de administración. No lo compartas con las participantes.</p>
    </main>
  );
}
