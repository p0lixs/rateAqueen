"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Globe2, LockKeyhole, Play, Plus, Presentation, RefreshCw, Trash2 } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import SiteHeader from "@/components/site-header";
import ConfirmModal from "@/components/confirm-modal";
import { useI18n } from "@/components/i18n-provider";

type AdminData = {
  title: string;
  status: "registration" | "voting" | "results";
  visibility: "private" | "public";
  public_token: string | null;
  invitations: { name: string; nickname: string; token: string; has_voted: boolean }[];
};

export default function ManageEvent({ token }: { token: string }) {
  const { t, error: translateError } = useI18n();
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [pendingAction, setPendingAction] = useState<"close" | "delete" | null>(null);

  const load = useCallback(async () => {
    const { data: { session } } = await getSupabaseBrowser().auth.getSession();
    const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
    const response = await fetch(`/api/manage/${token}`, { cache: "no-store", headers });
    const json = await response.json();
    if (!response.ok) return setError(translateError(json.error || "No se pudo abrir la partida"));
    setData(json);
  }, [token, translateError]);

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
      body: JSON.stringify({ name: newName }),
    });
    const json = await response.json();
    if (!response.ok) setActionError(translateError(json.error || "No se pudo añadir la participante"));
    else { setNewName(""); await load(); }
    setBusy(false);
  }

  async function closeVoting() {
    setBusy(true); setActionError("");
    const response = await fetch(`/api/manage/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "close" }) });
    const json = await response.json();
    if (!response.ok) setActionError(translateError(json.error || "No se pudo cerrar la votación"));
    else await load();
    setPendingAction(null);
    setBusy(false);
  }

  async function openVoting() {
    setBusy(true); setActionError("");
    const response = await fetch(`/api/manage/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "open" }) });
    const json = await response.json();
    if (!response.ok) setActionError(translateError(json.error || "No se pudo abrir la votación"));
    else await load();
    setBusy(false);
  }

  async function deleteRoom() {
    setBusy(true); setActionError("");
    const response = await fetch(`/api/manage/${token}`, { method: "DELETE" });
    const json = await response.json();
    if (!response.ok) {
      setActionError(translateError(json.error || "No se pudo eliminar la sala"));
      setPendingAction(null);
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
        <p className="eyebrow">{t("organizerPanel")}</p>
        <h2>{data.title}</h2>
        <span className="room-kind">{data.visibility === "public" ? <><Globe2 size={13} /> {t("publicRoom")}</> : <><LockKeyhole size={13} /> {t("privateRoom")}</>}</span>
        <p className="lede">{data.visibility === "public" ? t("publicManageLead") : t("privateManageLead")}</p>
      </section>
      <div className="stat-grid">
        <div className="stat"><strong>{cast}/{data.invitations.length}</strong><span>{t("votesReceived")}</span></div>
        <div className="stat"><strong>{data.status === "results" ? t("published") : data.status === "registration" ? t("registrationOpen") : t("open")}</strong><span>{t("state")}</span></div>
      </div>
      {data.status === "results" && <a className="btn btn-primary" href={`/results/${token}`}><ExternalLink size={17} /> {t("viewFinal")}</a>}

      {data.visibility === "public" && data.public_token && <section className="card public-link-card">
        <div><p className="eyebrow">{t("globalLink")}</p><h3>{t("oneInviteEveryone")}</h3><p>{t("publicLinkHelp")}</p></div>
        <div className="button-row"><button className="btn btn-soft" onClick={copyPublicLink}>{copied === "public" ? <Check size={15} /> : <Copy size={15} />} {copied === "public" ? t("copied") : t("copyLink")}</button><a className="btn btn-soft" href={`/display/${data.public_token}`} target="_blank"><Presentation size={16} /> {t("projectorMode")}</a></div>
      </section>}

      {data.status === "registration" && <section className="open-panel">
        <div><strong>{t("readyToOpen")}</strong><p>{t("readyToOpenHelp")}</p></div>
        <button className="btn btn-primary" onClick={openVoting} disabled={busy}><Play size={16} /> {t("openVoting")}</button>
      </section>}

      {data.status !== "results" && data.visibility === "private" && <section className="card add-participant-card">
        <div className="section-title"><h3>{t("addParticipant")}</h3><span className="count">{t("roomStaysOpen")}</span></div>
        <form className="add-participant" onSubmit={addParticipant}>
          <input className="input" placeholder={t("name")} value={newName} onChange={(event) => setNewName(event.target.value)} required maxLength={60} />
          <button className="btn btn-soft" disabled={busy}><Plus size={16} /> {t("add")}</button>
        </form>
      </section>}

      <section className="card">
        <div className="section-title"><h3>{data.visibility === "public" ? t("members") : t("personalLinks")}</h3><button className="icon-btn" onClick={load} aria-label={t("refresh")}><RefreshCw size={17} /></button></div>
        {data.invitations.length === 0 && <div className="empty-state">{data.visibility === "public" ? t("noMembers") : t("noParticipants")}</div>}
        {data.invitations.map((invitation) => (
          <div className="invite" key={invitation.token}>
            <div><strong>{invitation.name}</strong><small><span className={`status-dot ${invitation.has_voted ? "done" : ""}`} />{invitation.has_voted ? t("alreadyVoted") : t("pending")}</small></div>
            {data.visibility === "private" && <button className="btn btn-soft" onClick={() => copyLink(invitation.token)}>{copied === invitation.token ? <Check size={15} /> : <Copy size={15} />} {copied === invitation.token ? t("copied") : t("copy")}</button>}
          </div>
        ))}
      </section>
      {actionError && <div className="notice error">{actionError}</div>}
      {data.status === "voting" && <section className="close-panel">
        <div><strong>{t("closePublish")}</strong><p>{t("closePublishHelp")}</p></div>
        <button className="btn btn-danger" onClick={() => setPendingAction("close")} disabled={busy}><LockKeyhole size={16} /> {t("closeVoting")}</button>
      </section>}
      {data.status !== "results" && <section className="delete-panel">
        <div><strong>{t("deleteRoom")}</strong><p>{t("deleteHelp")}</p></div>
        <button className="btn btn-delete" onClick={() => setPendingAction("delete")} disabled={busy}><Trash2 size={16} /> {t("delete")}</button>
      </section>}
      <ConfirmModal open={pendingAction === "close"} title={t("confirmCloseTitle")} description={t("confirmCloseText")} confirmLabel={t("confirmCloseAction")} loading={busy} onConfirm={closeVoting} onClose={() => setPendingAction(null)} />
      <ConfirmModal open={pendingAction === "delete"} title={t("confirmDeleteTitle")} description={t("confirmDeleteText")} confirmLabel={t("confirmDeleteAction")} tone="danger" loading={busy} onConfirm={deleteRoom} onClose={() => setPendingAction(null)} />
      <p className="privacy">{t("keepAdminLink")}</p>
    </main>
  );
}
