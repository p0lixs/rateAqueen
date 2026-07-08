"use client";

import AppMenu from "@/components/app-menu";
import { useI18n } from "@/components/i18n-provider";
import { API_ERROR } from "@/lib/api-errors";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { Crown, Globe2, ImagePlus, LockKeyhole, Plus, Sparkles, Trash2 } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type QueenDraft = { name: string; file?: File; preview?: string; photoError?: string };
type PersonDraft = { name: string };

const MAX_PEOPLE = 100;
const MAX_PHOTO_SIZE = 5_000_000;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function CreateRoom() {
   const { t, error: translateError } = useI18n();
   const [title, setTitle] = useState("");
   const [queens, setQueens] = useState<QueenDraft[]>([{ name: "" }, { name: "" }, { name: "" }]);
   const [people, setPeople] = useState<PersonDraft[]>([{ name: "" }, { name: "" }]);
   const [visibility, setVisibility] = useState<"private" | "public">("public");
   const [startMode, setStartMode] = useState<"voting" | "registration">("voting");
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState("");
   const previewUrls = useRef(new Set<string>());

   const duplicateQueens = useMemo(() => duplicateIndexes(queens), [queens]);
   const duplicatePeople = useMemo(() => duplicateIndexes(people), [people]);
   const formInvalid =
      !title.trim() ||
      queens.some((queen) => !queen.name.trim() || queen.photoError) ||
      duplicateQueens.size > 0 ||
      (visibility === "private" &&
         (people.length > MAX_PEOPLE || people.some((person) => !person.name.trim()) || duplicatePeople.size > 0));

   useEffect(() => {
      getSupabaseBrowser()
         .auth.getSession()
         .then(({ data }) => {
            if (!data.session) window.location.href = "/auth?next=/create";
         });
   }, []);

   useEffect(() => {
      const urls = previewUrls.current;
      return () => urls.forEach((url) => URL.revokeObjectURL(url));
   }, []);

   function updateQueen(index: number, patch: Partial<QueenDraft>) {
      setQueens((current) => current.map((queen, i) => (i === index ? { ...queen, ...patch } : queen)));
   }

   function pickPhoto(index: number, event: ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0];
      if (!file) return;
      const currentPreview = queens[index].preview;
      if (!PHOTO_TYPES.has(file.type) || file.size > MAX_PHOTO_SIZE) {
         event.target.value = "";
         updateQueen(index, { photoError: t("invalidQueenPhoto") });
         return;
      }
      if (currentPreview) {
         URL.revokeObjectURL(currentPreview);
         previewUrls.current.delete(currentPreview);
      }
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);
      updateQueen(index, { file, preview, photoError: undefined });
   }

   function removeQueen(index: number) {
      const preview = queens[index].preview;
      if (preview) {
         URL.revokeObjectURL(preview);
         previewUrls.current.delete(preview);
      }
      setQueens((current) => current.filter((_, i) => i !== index));
   }

   async function submit(event: FormEvent) {
      event.preventDefault();
      setError("");
      if (formInvalid) return setError(t("fixFormErrors"));
      if (queens.some((queen) => !queen.name.trim())) {
         return setError(t("addQueenNames"));
      }
      if (visibility === "private" && people.some((person) => !person.name.trim())) {
         return setError(t("addParticipantData"));
      }

      setLoading(true);
      const form = new FormData();
      form.set("title", title.trim());
      form.set("queens", JSON.stringify(queens.map((queen) => ({ name: queen.name.trim() }))));
      form.set(
         "people",
         JSON.stringify(visibility === "private" ? people.map((person) => ({ name: person.name.trim() })) : []),
      );
      form.set("visibility", visibility);
      form.set("startMode", startMode);
      queens.forEach((queen, index) => {
         if (queen.file) form.set(`photo_${index}`, queen.file);
      });

      try {
         const {
            data: { session },
         } = await getSupabaseBrowser().auth.getSession();
         if (!session) {
            window.location.href = "/auth?next=/create";
            return;
         }
         const response = await fetch("/api/events", {
            method: "POST",
            body: form,
            headers: { Authorization: `Bearer ${session.access_token}` },
         });
         const data = await response.json();
         if (!response.ok) throw new Error(translateError(data.error || API_ERROR.ROOM_CREATE_FAILED));
         window.location.href = `/manage/${data.adminToken}`;
      } catch (cause) {
         setError(cause instanceof Error ? cause.message : t("genericError"));
         setLoading(false);
      }
   }

   return (
      <main className="shell">
         <div className="topbar">
            <a className="brand" href="/">
               <span className="brand-mark">
                  <Crown size={18} />
               </span>{" "}
               Rate a Queen
            </a>
            <AppMenu />
         </div>
         <section className="hero">
            <p className="eyebrow">{t("gameTagline")}</p>
            <h1>
               {t("mayBest")}
               <br />
               <em>{t("win")}</em>
            </h1>
            <p className="lede">{t("createLead")}</p>
         </section>

         <form className="card" onSubmit={submit}>
            <p className="eyebrow">{t("newGame")}</p>
            <div className="field">
               <label htmlFor="title">{t("editionName")}</label>
               <input
                  id="title"
                  className="input"
                  placeholder={t("editionPlaceholder")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={80}
               />
            </div>

            <div className="section-title">
               <h3>{t("roomType")}</h3>
            </div>
            <div className="visibility-picker">
               <button
                  type="button"
                  className={`visibility-option ${visibility === "private" ? "active" : ""}`}
                  onClick={() => setVisibility("private")}
               >
                  <LockKeyhole size={20} />
                  <span>
                     <strong>{t("private")}</strong>
                     <small>{t("privateHelp")}</small>
                  </span>
               </button>
               <button
                  type="button"
                  className={`visibility-option ${visibility === "public" ? "active" : ""}`}
                  onClick={() => setVisibility("public")}
               >
                  <Globe2 size={20} />
                  <span>
                     <strong>{t("public")}</strong>
                     <small>{t("publicHelp")}</small>
                  </span>
               </button>
            </div>

            <div className="section-title">
               <h3>{t("votingStart")}</h3>
            </div>
            <div className="visibility-picker">
               <button
                  type="button"
                  className={`visibility-option ${startMode === "voting" ? "active" : ""}`}
                  onClick={() => setStartMode("voting")}
               >
                  <Sparkles size={20} />
                  <span>
                     <strong>{t("startNow")}</strong>
                     <small>{t("startNowHelp")}</small>
                  </span>
               </button>
               <button
                  type="button"
                  className={`visibility-option ${startMode === "registration" ? "active" : ""}`}
                  onClick={() => setStartMode("registration")}
               >
                  <LockKeyhole size={20} />
                  <span>
                     <strong>{t("registrationFirst")}</strong>
                     <small>{t("registrationFirstHelp")}</small>
                  </span>
               </button>
            </div>

            <div className="section-title">
               <h3>{t("queens")}</h3>
               <span className="count">{t("queensCount", { count: queens.length })}</span>
            </div>
            {queens.map((queen, index) => (
               <div className="repeat-item" key={index}>
               <div className="repeat-row">
                  <label className="photo-input" title={t("optionalPhoto")}>
                     {queen.preview ? <img src={queen.preview} alt="" /> : <ImagePlus size={20} />}
                     <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => pickPhoto(index, event)}
                     />
                  </label>
                  <input
                     className={`input ${!queen.name.trim() || duplicateQueens.has(index) ? "input-error" : ""}`}
                     placeholder={`${t("queen")} ${index + 1}`}
                     value={queen.name}
                     onChange={(e) => updateQueen(index, { name: e.target.value })}
                     maxLength={60}
                     aria-invalid={!queen.name.trim() || duplicateQueens.has(index)}
                  />
                  <button
                     type="button"
                     className="icon-btn"
                     aria-label={t("deleteQueen")}
                     disabled={queens.length <= 2}
                     onClick={() => removeQueen(index)}
                  >
                     <Trash2 size={18} />
                  </button>
               </div>
               {duplicateQueens.has(index) && <p className="inline-error">{t("duplicateName")}</p>}
               {queen.photoError && <p className="inline-error">{queen.photoError}</p>}
               </div>
            ))}
            <p className="field-hint">{t("optionalPhotos")}</p>
            <button type="button" className="btn btn-soft" onClick={() => setQueens([...queens, { name: "" }])}>
               <Plus size={16} /> {t("addQueen")}
            </button>

            {visibility === "private" && (
               <>
                  <div className="section-title">
                     <h3>{t("participants")}</h3>
                     <span className="count">{t("uniqueLinks")}</span>
                  </div>
                  {people.map((person, index) => (
                     <div className="repeat-item" key={index}>
                     <div className="repeat-row participant-row">
                        <input
                           className={`input ${!person.name.trim() || duplicatePeople.has(index) ? "input-error" : ""}`}
                           placeholder={t("name")}
                           value={person.name}
                           onChange={(e) =>
                              setPeople(
                                 people.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)),
                              )
                           }
                           maxLength={60}
                           aria-invalid={!person.name.trim() || duplicatePeople.has(index)}
                        />
                        <button
                           type="button"
                           className="icon-btn"
                           aria-label={t("deleteParticipant")}
                           disabled={people.length <= 1}
                           onClick={() => setPeople(people.filter((_, i) => i !== index))}
                        >
                           <Trash2 size={18} />
                        </button>
                     </div>
                     {duplicatePeople.has(index) && <p className="inline-error participant-error">{t("duplicateName")}</p>}
                     </div>
                  ))}
                  {people.length >= MAX_PEOPLE && <p className="inline-error">{t("participantLimit")}</p>}
                  <button type="button" className="btn btn-soft" disabled={people.length >= MAX_PEOPLE} onClick={() => setPeople([...people, { name: "" }])}>
                     <Plus size={16} /> {t("addPerson")}
                  </button>
               </>
            )}
            {visibility === "public" && <div className="notice">{t("publicJoinHelp")}</div>}

            {error && <div className="notice error">{error}</div>}
            <button className="btn btn-primary" disabled={loading || formInvalid}>
               <Sparkles size={18} /> {loading ? t("creatingRoom") : t("createRoom")}
            </button>
         </form>
      </main>
   );
}

function duplicateIndexes(items: Array<{ name: string }>) {
   const indexes = new Map<string, number[]>();
   items.forEach(({ name }, index) => {
      const normalized = name.trim().toLocaleLowerCase();
      if (normalized) indexes.set(normalized, [...(indexes.get(normalized) || []), index]);
   });
   return new Set([...indexes.values()].filter((matches) => matches.length > 1).flat());
}
