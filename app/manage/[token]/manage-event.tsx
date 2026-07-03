"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Globe2, LockKeyhole, Plus, RefreshCw, Trash2 } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import SiteHeader from "@/components/site-header";

type AdminData = {
  title: string;
  status: "voting" | "results";
  visibility: "private" | "public";
  public_token: string | null;
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

  async function copyPublicLink() {
    if (!data?.public_token) return;
    await navigator.clipboard.writeText(`${window.location.origin}/join/${data.public_token}`);
    setCopied("public");
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

  async function deleteRoom() {
    if (!confirm("¿Eliminar esta sala definitivamente? Se borrarán sus participantes, votos y reinas. Esta acción no se puede deshacer.")) return;
    setBusy(true); setActionError("");
    const response = await fetch(`/api/manage/${token}`, { method: "DELETE" });
    const json = await response.json();
    if (!response.ok) {
      setActionError(json.error || "No se pudo eliminar la sala");
      setBusy(false);
    } else window.location.href = "/";
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
        <span className="room-kind">{data.visibility === "public" ? <><Globe2 size={13} /> Sala pública</> : <><LockKeyhole size={13} /> Sala privada</>}</span>
        <p className="lede">{data.visibility === "public" ? "Comparte el enlace global o deja que encuentren la sala en el buscador. Aquí aparecerán las personas que se unan." : "Comparte cada enlace con su persona y añade nuevas participantes mientras la sala siga abierta. Tú decides cuándo cerrar y publicar el resultado."}</p>
      </section>
      <div className="stat-grid">
        <div className="stat"><strong>{cast}/{data.invitations.length}</strong><span>votos recibidos</span></div>
        <div className="stat"><strong>{data.status === "results" ? "Publicado" : "Abierto"}</strong><span>estado</span></div>
      </div>
      {data.status === "results" && <a className="btn btn-primary" href={`/results/${token}`}><ExternalLink size={17} /> Ver clasificación final</a>}

      {data.visibility === "public" && data.public_token && <section className="card public-link-card">
        <div><p className="eyebrow">Enlace global</p><h3>Una invitación para todo el mundo</h3><p>Las personas con cuenta podrán abrirlo, unirse y votar.</p></div>
        <button className="btn btn-soft" onClick={copyPublicLink}>{copied === "public" ? <Check size={15} /> : <Copy size={15} />} {copied === "public" ? "Copiado" : "Copiar enlace"}</button>
      </section>}

      {data.status === "voting" && data.visibility === "private" && <section className="card add-participant-card">
        <div className="section-title"><h3>Añadir participante</h3><span className="count">La sala seguirá abierta</span></div>
        <form className="add-participant" onSubmit={addParticipant}>
          <input className="input" placeholder="Nombre" value={newName} onChange={(event) => setNewName(event.target.value)} required maxLength={60} />
          <input className="input" placeholder="Apodo" value={newNickname} onChange={(event) => setNewNickname(event.target.value)} required maxLength={60} />
          <button className="btn btn-soft" disabled={busy}><Plus size={16} /> Añadir</button>
        </form>
      </section>}

      <section className="card">
        <div className="section-title"><h3>{data.visibility === "public" ? "Miembros" : "Enlaces personales"}</h3><button className="icon-btn" onClick={load} aria-label="Actualizar"><RefreshCw size={17} /></button></div>
        {data.invitations.length === 0 && <div className="empty-state">{data.visibility === "public" ? "Todavía no se ha unido nadie." : "No hay participantes."}</div>}
        {data.invitations.map((invitation) => (
          <div className="invite" key={invitation.token}>
            <div><strong>{invitation.nickname}</strong><small>{invitation.name} · <span className={`status-dot ${invitation.has_voted ? "done" : ""}`} />{invitation.has_voted ? "Ya ha votado" : "Pendiente"}</small></div>
            {data.visibility === "private" && <button className="btn btn-soft" onClick={() => copyLink(invitation.token)}>{copied === invitation.token ? <Check size={15} /> : <Copy size={15} />} {copied === invitation.token ? "Copiado" : "Copiar"}</button>}
          </div>
        ))}
      </section>
      {actionError && <div className="notice error">{actionError}</div>}
      {data.status === "voting" && <section className="close-panel">
        <div><strong>Cerrar y publicar</strong><p>La clasificación se calculará con los votos recibidos hasta ese momento.</p></div>
        <button className="btn btn-danger" onClick={closeVoting} disabled={busy}><LockKeyhole size={16} /> Cerrar votación</button>
      </section>}
      {data.status === "voting" && <section className="delete-panel">
        <div><strong>Eliminar sala</strong><p>Borra permanentemente la sala y todos sus datos. No estará disponible después del cierre.</p></div>
        <button className="btn btn-delete" onClick={deleteRoom} disabled={busy}><Trash2 size={16} /> Eliminar</button>
      </section>}
      <p className="privacy">Guarda esta página: es tu enlace privado de administración. No lo compartas con las participantes.</p>
    </main>
  );
}
