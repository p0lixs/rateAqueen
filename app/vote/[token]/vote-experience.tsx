"use client";

import { useCallback, useEffect, useState } from "react";
import { closestCenter, DndContext, DragEndEvent, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Crown, GripVertical, LockKeyhole, Send } from "lucide-react";
import type { EventInfo, Queen } from "@/lib/types";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import SiteHeader from "@/components/site-header";

function SortableQueen({ queen, index }: { queen: Queen; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: queen.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`queen-row ${isDragging ? "dragging" : ""}`}>
      <span className="rank">{index + 1}</span>
      {queen.image_url ? <img className="queen-photo" src={queen.image_url} alt={queen.name} /> : <span className="queen-photo queen-photo-empty"><Crown size={23} /></span>}
      <span className="queen-name">{queen.name}</span>
      <button type="button" className="icon-btn drag-handle" aria-label={`Mover a ${queen.name}`} {...attributes} {...listeners}><GripVertical size={21} /></button>
    </div>
  );
}

export default function VoteExperience({ token }: { token: string }) {
  const [data, setData] = useState<EventInfo | null>(null);
  const [queens, setQueens] = useState<Queen[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
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
    if (!response.ok) return setError(json.error || "Esta invitación no es válida");
    setData(json);
    setQueens(json.queens);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function dragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setQueens((items) => arrayMove(items, items.findIndex((item) => item.id === active.id), items.findIndex((item) => item.id === over.id)));
    }
  }

  async function submit() {
    if (!confirm("¿Enviar este orden? Después no podrás cambiarlo.")) return;
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
      setError(json.error || "No se pudo guardar el voto");
      return setSending(false);
    }
    if (json.status === "results") window.location.href = `/results/${token}`;
    else await load();
    setSending(false);
  }

  if (error && !data) return <main className="shell"><SiteHeader /><div className="notice error">{error}</div></main>;
  if (!data) return <div className="spinner" />;
  if (data.status === "results") {
    return <main className="shell center"><SiteHeader /><section className="hero"><p className="eyebrow">Sashay, results</p><h2>Votación cerrada</h2><p className="lede">La clasificación final está lista.</p><a className="btn btn-primary" href={`/results/${token}`}>Ver clasificación</a></section></main>;
  }
  if (data.voter.has_voted) {
    return <main className="shell center"><SiteHeader /><section className="hero"><p className="eyebrow">Voto recibido</p><h2>Gracias, {data.voter.nickname}</h2><p className="lede">Tu orden se ha guardado de forma anónima. La administradora publicará el resultado cuando cierre la votación.</p><div className="progress">{data.votes_cast} de {data.votes_total} votos recibidos</div><button className="btn btn-primary" onClick={load}>Comprobar resultados</button></section></main>;
  }

  return (
    <main className="shell">
      <SiteHeader />
      <section className="vote-head">
        <p className="eyebrow">Hola, {data.voter.nickname}</p>
        <h1>{data.title}</h1>
        <p className="lede">Arrastra las reinas de mejor a peor. La primera recibirá más puntos.</p>
      </section>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
        <SortableContext items={queens.map((queen) => queen.id)} strategy={verticalListSortingStrategy}>
          <div className="queen-list">{queens.map((queen, index) => <SortableQueen queen={queen} index={index} key={queen.id} />)}</div>
        </SortableContext>
      </DndContext>
      {error && <div className="notice error">{error}</div>}
      <button className="btn btn-primary" onClick={submit} disabled={sending}><Send size={17} /> {sending ? "Enviando…" : "Confirmar mi ranking"}</button>
      <p className="privacy"><LockKeyhole size={13} /> Tu identidad y tu ranking se guardan por separado. Nadie podrá consultar cómo has ordenado a las reinas.</p>
    </main>
  );
}
