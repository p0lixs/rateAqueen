"use client";

import { useCallback, useEffect, useState } from "react";
import { closestCenter, DndContext, DragEndEvent, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Crown, GripVertical, Hourglass, LockKeyhole, Send } from "lucide-react";
import type { EventInfo, Queen } from "@/lib/types";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import SiteHeader from "@/components/site-header";
import ConfirmModal from "@/components/confirm-modal";
import { useI18n } from "@/components/i18n-provider";
import { API_ERROR } from "@/lib/api-errors";

function SortableQueen({ queen, index }: { queen: Queen; index: number }) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: queen.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`queen-row ${isDragging ? "dragging" : ""}`}>
      <span className="rank">{index + 1}</span>
      {queen.image_url ? <img className="queen-photo" src={queen.image_url} alt={queen.name} /> : <span className="queen-photo queen-photo-empty"><Crown size={23} /></span>}
      <span className="queen-name">{queen.name}</span>
      <button type="button" className="icon-btn drag-handle" aria-label={t("moveQueen", { name: queen.name })} {...attributes} {...listeners}><GripVertical size={21} /></button>
    </div>
  );
}

export default function VoteExperience({ token }: { token: string }) {
  const { t, error: translateError } = useI18n();
  const [data, setData] = useState<EventInfo | null>(null);
  const [queens, setQueens] = useState<Queen[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    const { data: { session } } = await getSupabaseBrowser().auth.getSession();
    const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
    const response = await fetch(`/api/invitations/${token}`, { cache: "no-store", headers });
    const json = await response.json();
    if (response.status === 401) return void (window.location.href = `/auth?next=${encodeURIComponent(`/vote/${token}`)}`);
    if (!response.ok) return setError(translateError(json.error || API_ERROR.INVALID_INVITATION));
    setData(json);
    setQueens(json.queens);
  }, [token, translateError]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!data || (data.status !== "registration" && !data.voter.has_voted)) return;
    const interval = window.setInterval(load, 12_000);
    return () => window.clearInterval(interval);
  }, [data, load]);

  function dragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setQueens((items) => arrayMove(items, items.findIndex((item) => item.id === active.id), items.findIndex((item) => item.id === over.id)));
    }
  }

  async function submit() {
    setSending(true);
    setError("");
    const { data: { session } } = await getSupabaseBrowser().auth.getSession();
    const response = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      body: JSON.stringify({ token, ranking: queens.map((queen) => queen.id) }),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(translateError(json.error || API_ERROR.VOTE_SAVE_FAILED));
      setConfirming(false);
      return setSending(false);
    }
    if (json.status === "results") window.location.href = `/results/${token}`;
    else await load();
    setConfirming(false);
    setSending(false);
  }

  if (error && !data) return <main className="shell"><SiteHeader /><div className="notice error">{error}</div></main>;
  if (!data) return <div className="spinner" />;
  if (data.status === "results") {
    return <main className="shell center"><SiteHeader /><section className="hero"><p className="eyebrow">{t("resultsTagline")}</p><h2>{t("votingClosed")}</h2><p className="lede">{t("rankingReady")}</p><a className="btn btn-primary" href={`/results/${token}`}>{t("viewRanking")}</a></section></main>;
  }
  if (data.status === "registration") {
    return <main className="shell center"><SiteHeader /><section className="hero"><p className="eyebrow">{t("registered")}</p><h2>{t("thanks", { name: data.voter.nickname })}</h2><p className="lede">{t("waitingVotingOpen")}</p><div className="progress">{data.votes_total} {t("registeredPeople")}</div><button className="btn btn-primary waiting-button" disabled aria-live="polite"><Hourglass size={17} /> {t("waitingOrganizer")}</button><p className="auto-check">{t("autoOpenCheck")}</p></section></main>;
  }
  if (data.voter.has_voted) {
    return <main className="shell center"><SiteHeader /><section className="hero"><p className="eyebrow">{t("voteReceived")}</p><h2>{t("thanks", { name: data.voter.nickname })}</h2><p className="lede">{t("savedAnonymous")}</p><div className="progress">{data.votes_cast}/{data.votes_total}</div><button className="btn btn-primary waiting-button" disabled aria-live="polite"><Hourglass size={17} /> {t("waitingClose")}</button><p className="auto-check">{t("autoCheck")}</p></section></main>;
  }

  return (
    <main className="shell">
      <SiteHeader />
      <section className="vote-head">
        <p className="eyebrow">{t("hello", { name: data.voter.nickname })}</p>
        <h1>{data.title}</h1>
        <p>{t("organizedBy", { name: data.owner_name || t("unknownOrganizer") })}</p>
        <p className="lede">{t("voteLead")}</p>
      </section>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
        <SortableContext items={queens.map((queen) => queen.id)} strategy={verticalListSortingStrategy}>
          <div className="queen-list">{queens.map((queen, index) => <SortableQueen queen={queen} index={index} key={queen.id} />)}</div>
        </SortableContext>
      </DndContext>
      {error && <div className="notice error">{error}</div>}
      <button className="btn btn-primary" onClick={() => setConfirming(true)} disabled={sending}><Send size={17} /> {sending ? t("sending") : t("confirmRanking")}</button>
      <p className="privacy"><LockKeyhole size={13} /> {t("privacyVote")}</p>
      <ConfirmModal open={confirming} title={t("submitTitle")} description={t("submitText")} confirmLabel={t("submitAction")} loading={sending} onConfirm={submit} onClose={() => setConfirming(false)} />
    </main>
  );
}
