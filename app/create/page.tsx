"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Crown, Globe2, ImagePlus, LockKeyhole, Plus, Sparkles, Trash2 } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useI18n } from "@/components/i18n-provider";

type QueenDraft = { name: string; file?: File; preview?: string };
type PersonDraft = { name: string; nickname: string };

export default function CreateRoom() {
  const { t, error: translateError } = useI18n();
  const [title, setTitle] = useState("");
  const [queens, setQueens] = useState<QueenDraft[]>([{ name: "" }, { name: "" }, { name: "" }]);
  const [people, setPeople] = useState<PersonDraft[]>([{ name: "", nickname: "" }, { name: "", nickname: "" }]);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSupabaseBrowser().auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = "/auth?next=/create";
    });
  }, []);

  function updateQueen(index: number, patch: Partial<QueenDraft>) {
    setQueens((current) => current.map((queen, i) => i === index ? { ...queen, ...patch } : queen));
  }

  function pickPhoto(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) updateQueen(index, { file, preview: URL.createObjectURL(file) });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (queens.some((queen) => !queen.name.trim())) {
      return setError(t("addQueenNames"));
    }
    if (visibility === "private" && people.some((person) => !person.name.trim() || !person.nickname.trim())) {
      return setError(t("addParticipantData"));
    }

    setLoading(true);
    const form = new FormData();
    form.set("title", title.trim());
    form.set("queens", JSON.stringify(queens.map((queen) => ({ name: queen.name.trim() }))));
    form.set("people", JSON.stringify(visibility === "private" ? people.map((person) => ({ name: person.name.trim(), nickname: person.nickname.trim() })) : []));
    form.set("visibility", visibility);
    queens.forEach((queen, index) => { if (queen.file) form.set(`photo_${index}`, queen.file); });

    try {
      const { data: { session } } = await getSupabaseBrowser().auth.getSession();
      if (!session) {
        window.location.href = "/auth?next=/create";
        return;
      }
      const response = await fetch("/api/events", { method: "POST", body: form, headers: { Authorization: `Bearer ${session.access_token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(translateError(data.error || "No se pudo crear la partida"));
      window.location.href = `/manage/${data.adminToken}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("genericError"));
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <div className="topbar"><a className="brand" href="/"><span className="brand-mark"><Crown size={18} /></span> Rate a Queen</a><a className="btn btn-soft" href="/"><ArrowLeft size={15} /> {t("backMyRooms")}</a></div>
      <section className="hero">
        <p className="eyebrow">{t("gameTagline")}</p>
        <h1>{t("mayBest")}<br /><em>{t("win")}</em></h1>
        <p className="lede">{t("createLead")}</p>
      </section>

      <form className="card" onSubmit={submit}>
        <p className="eyebrow">{t("newGame")}</p>
        <div className="field">
          <label htmlFor="title">{t("editionName")}</label>
          <input id="title" className="input" placeholder={t("editionPlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} />
        </div>

        <div className="section-title"><h3>{t("roomType")}</h3></div>
        <div className="visibility-picker">
          <button type="button" className={`visibility-option ${visibility === "private" ? "active" : ""}`} onClick={() => setVisibility("private")}><LockKeyhole size={20} /><span><strong>{t("private")}</strong><small>{t("privateHelp")}</small></span></button>
          <button type="button" className={`visibility-option ${visibility === "public" ? "active" : ""}`} onClick={() => setVisibility("public")}><Globe2 size={20} /><span><strong>{t("public")}</strong><small>{t("publicHelp")}</small></span></button>
        </div>

        <div className="section-title"><h3>{t("queens")}</h3><span className="count">{t("queensCount", { count: queens.length })}</span></div>
        {queens.map((queen, index) => (
          <div className="repeat-row" key={index}>
            <label className="photo-input" title={t("optionalPhoto")}>
              {queen.preview ? <img src={queen.preview} alt="" /> : <ImagePlus size={20} />}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => pickPhoto(index, event)} />
            </label>
            <input className="input" placeholder={`${t("queen")} ${index + 1}`} value={queen.name} onChange={(e) => updateQueen(index, { name: e.target.value })} maxLength={60} />
            <button type="button" className="icon-btn" aria-label={t("deleteQueen")} disabled={queens.length <= 2} onClick={() => setQueens(queens.filter((_, i) => i !== index))}><Trash2 size={18} /></button>
          </div>
        ))}
        <p className="field-hint">{t("optionalPhotos")}</p>
        <button type="button" className="btn btn-soft" onClick={() => setQueens([...queens, { name: "" }])}><Plus size={16} /> {t("addQueen")}</button>

        {visibility === "private" && <><div className="section-title"><h3>{t("participants")}</h3><span className="count">{t("uniqueLinks")}</span></div>
        {people.map((person, index) => (
          <div className="repeat-row person-row" key={index}>
            <input className="input" placeholder={t("name")} value={person.name} onChange={(e) => setPeople(people.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} maxLength={60} />
            <input className="input nickname" placeholder={t("nickname")} value={person.nickname} onChange={(e) => setPeople(people.map((item, i) => i === index ? { ...item, nickname: e.target.value } : item))} maxLength={60} />
            <button type="button" className="icon-btn" aria-label={t("deleteParticipant")} disabled={people.length <= 1} onClick={() => setPeople(people.filter((_, i) => i !== index))}><Trash2 size={18} /></button>
          </div>
        ))}
        <button type="button" className="btn btn-soft" onClick={() => setPeople([...people, { name: "", nickname: "" }])}><Plus size={16} /> {t("addPerson")}</button></>}
        {visibility === "public" && <div className="notice">{t("publicJoinHelp")}</div>}

        {error && <div className="notice error">{error}</div>}
        <button className="btn btn-primary" disabled={loading}><Sparkles size={18} /> {loading ? t("creatingRoom") : t("createRoom")}</button>
      </form>
    </main>
  );
}
