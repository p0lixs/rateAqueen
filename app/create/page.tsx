"use client";

import AppMenu from "@/components/app-menu";
import { useI18n } from "@/components/i18n-provider";
import { API_ERROR } from "@/lib/api-errors";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import {
   closestCenter,
   DndContext,
   DragEndEvent,
   KeyboardSensor,
   PointerSensor,
   TouchSensor,
   useSensor,
   useSensors,
} from "@dnd-kit/core";
import {
   arrayMove,
   SortableContext,
   sortableKeyboardCoordinates,
   useSortable,
   verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Crown, Globe2, GripVertical, ImagePlus, LockKeyhole, Plus, Sparkles, Trash2 } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

type QueenDraft = { id: string; name: string; file?: File; preview?: string; photoError?: string };
type PersonDraft = { name: string };

const MAX_PEOPLE = 100;
const MAX_PHOTO_SIZE = 5_000_000;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const QUEEN_PAGE_SIZE = 20;
const CROPPED_IMAGE_SIZE = 1000;

function newQueen(name = ""): QueenDraft {
   return { id: crypto.randomUUID(), name };
}

type SortableQueenDraftProps = {
   queen: QueenDraft;
   index: number;
   duplicate: boolean;
   canDelete: boolean;
   onChange: (patch: Partial<QueenDraft>) => void;
   onPhoto: (event: ChangeEvent<HTMLInputElement>) => void;
   onDelete: () => void;
   t: (key: string, values?: Record<string, string | number>) => string;
};

function SortableQueenDraft({ queen, index, duplicate, canDelete, onChange, onPhoto, onDelete, t }: SortableQueenDraftProps) {
   const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: queen.id });
   return (
      <div
         ref={setNodeRef}
         style={{ transform: CSS.Transform.toString(transform), transition }}
         className={`repeat-item sortable-draft ${isDragging ? "dragging" : ""}`}
      >
         <div className="repeat-row create-queen-row">
            <label className="photo-input" title={t("optionalPhoto")}>
               {queen.preview ? <img src={queen.preview} alt="" /> : <ImagePlus size={20} />}
               <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} />
            </label>
            <input
               className={`input ${!queen.name.trim() || duplicate ? "input-error" : ""}`}
               placeholder={`${t("queen")} ${index + 1}`}
               value={queen.name}
               onChange={(event) => onChange({ name: event.target.value })}
               maxLength={60}
               aria-invalid={!queen.name.trim() || duplicate}
            />
            <button
               type="button"
               className="icon-btn drag-handle"
               aria-label={t("moveQueen", { name: queen.name || `${t("queen")} ${index + 1}` })}
               {...attributes}
               {...listeners}
            >
               <GripVertical size={18} />
            </button>
            <button type="button" className="icon-btn" aria-label={t("deleteQueen")} disabled={!canDelete} onClick={onDelete}>
               <Trash2 size={18} />
            </button>
         </div>
         {duplicate && <p className="inline-error">{t("duplicateName")}</p>}
         {queen.photoError && <p className="inline-error">{queen.photoError}</p>}
      </div>
   );
}

type PhotoCropModalProps = {
   source: string;
   saving: boolean;
   onCancel: () => void;
   onConfirm: (area: Area) => void;
   t: (key: string, values?: Record<string, string | number>) => string;
};

function PhotoCropModal({ source, saving, onCancel, onConfirm, t }: PhotoCropModalProps) {
   const [crop, setCrop] = useState({ x: 0, y: 0 });
   const [zoom, setZoom] = useState(1);
   const [area, setArea] = useState<Area | null>(null);

   useEffect(() => {
      const handleKey = (event: KeyboardEvent) => {
         if (event.key === "Escape" && !saving) onCancel();
      };
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKey);
      return () => {
         document.body.style.overflow = "";
         window.removeEventListener("keydown", handleKey);
      };
   }, [onCancel, saving]);

   return (
      <div className="modal-backdrop crop-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !saving && onCancel()}>
         <section className="photo-crop-modal" role="dialog" aria-modal="true" aria-labelledby="crop-title">
            <div>
               <p className="eyebrow">{t("adjustPhoto")}</p>
               <h3 id="crop-title">{t("cropPhotoTitle")}</h3>
               <p className="crop-help">{t("cropPhotoHelp")}</p>
            </div>
            <div className="crop-stage">
               <Cropper
                  image={source}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="rect"
                  showGrid
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, pixels) => setArea(pixels)}
               />
            </div>
            <label className="crop-zoom">
               <span>{t("zoom")}</span>
               <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
            </label>
            <div className="modal-actions">
               <button type="button" className="btn btn-modal-cancel" onClick={onCancel} disabled={saving}>{t("cancel")}</button>
               <button type="button" className="btn btn-modal-primary" onClick={() => area && onConfirm(area)} disabled={saving || !area}>
                  {saving ? t("croppingPhoto") : t("useCrop")}
               </button>
            </div>
         </section>
      </div>
   );
}

export default function CreateRoom() {
   const { t, error: translateError } = useI18n();
   const [title, setTitle] = useState("");
   const [queens, setQueens] = useState<QueenDraft[]>([
      { id: "initial-1", name: "" },
      { id: "initial-2", name: "" },
      { id: "initial-3", name: "" },
   ]);
   const [people, setPeople] = useState<PersonDraft[]>([{ name: "" }, { name: "" }]);
   const [visibility, setVisibility] = useState<"private" | "public">("public");
   const [startMode, setStartMode] = useState<"voting" | "registration">("voting");
   const [loading, setLoading] = useState(false);
   const [templateLoading, setTemplateLoading] = useState(false);
   const [templateLoaded, setTemplateLoaded] = useState(false);
   const [visibleQueenCount, setVisibleQueenCount] = useState(QUEEN_PAGE_SIZE);
   const [photoToCrop, setPhotoToCrop] = useState<{ index: number; file: File; source: string } | null>(null);
   const [croppingPhoto, setCroppingPhoto] = useState(false);
   const [error, setError] = useState("");
   const previewUrls = useRef(new Set<string>());
   const templateRequested = useRef(false);
   const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(TouchSensor),
      useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
   );

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
      if (templateRequested.current) return;
      const templateToken = new URLSearchParams(window.location.search).get("template");
      if (!templateToken) return;
      let active = true;
      setTemplateLoading(true);
      getSupabaseBrowser().auth.getSession().then(async ({ data: { session } }) => {
         const headers = session ? { Authorization: `Bearer ${session.access_token}` } : undefined;
         const response = await fetch(`/api/manage/${encodeURIComponent(templateToken)}`, { cache: "no-store", headers });
         const template = await response.json();
         if (!active) return;
         if (!response.ok) setError(translateError(template.error || API_ERROR.ROOM_OPEN_FAILED));
         else {
            templateRequested.current = true;
            const templateQueens = (template.queens as Array<{ name: string; sort_order: number }>)
               .sort((a, b) => a.sort_order - b.sort_order)
               .map((queen, index) => ({ id: `template-${index}`, name: queen.name }));
            setTitle(t("copyTitle", { title: template.title }).slice(0, 80));
            setQueens(templateQueens.length >= 2 ? templateQueens : [newQueen(), newQueen()]);
            setPeople(
               template.visibility === "private" && template.invitations.length
                  ? template.invitations.map((person: { name: string }) => ({ name: person.name }))
                  : [{ name: "" }, { name: "" }],
            );
            setVisibility(template.visibility);
            setStartMode(template.status === "registration" ? "registration" : "voting");
            setVisibleQueenCount(QUEEN_PAGE_SIZE);
            setTemplateLoaded(true);
         }
         setTemplateLoading(false);
      });
      return () => {
         active = false;
      };
   }, [t, translateError]);

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
      event.target.value = "";
      if (!PHOTO_TYPES.has(file.type) || file.size > MAX_PHOTO_SIZE) {
         updateQueen(index, { photoError: t("invalidQueenPhoto") });
         return;
      }
      const source = URL.createObjectURL(file);
      previewUrls.current.add(source);
      setPhotoToCrop({ index, file, source });
   }

   function cancelPhotoCrop() {
      if (!photoToCrop) return;
      URL.revokeObjectURL(photoToCrop.source);
      previewUrls.current.delete(photoToCrop.source);
      setPhotoToCrop(null);
   }

   async function confirmPhotoCrop(area: Area) {
      if (!photoToCrop) return;
      setCroppingPhoto(true);
      try {
         const file = await cropPhoto(photoToCrop.file, area);
         const currentPreview = queens[photoToCrop.index]?.preview;
         if (currentPreview) {
            URL.revokeObjectURL(currentPreview);
            previewUrls.current.delete(currentPreview);
         }
         URL.revokeObjectURL(photoToCrop.source);
         previewUrls.current.delete(photoToCrop.source);
         const preview = URL.createObjectURL(file);
         previewUrls.current.add(preview);
         updateQueen(photoToCrop.index, { file, preview, photoError: undefined });
         setPhotoToCrop(null);
      } catch {
         updateQueen(photoToCrop.index, { photoError: t("cropPhotoFailed") });
      } finally {
         setCroppingPhoto(false);
      }
   }

   function removeQueen(index: number) {
      const preview = queens[index].preview;
      if (preview) {
         URL.revokeObjectURL(preview);
         previewUrls.current.delete(preview);
      }
      setQueens((current) => current.filter((_, i) => i !== index));
   }

   function dragQueen(event: DragEndEvent) {
      if (!event.over || event.active.id === event.over.id) return;
      setQueens((current) => {
         const from = current.findIndex((queen) => queen.id === event.active.id);
         const to = current.findIndex((queen) => queen.id === event.over?.id);
         return from >= 0 && to >= 0 ? arrayMove(current, from, to) : current;
      });
   }

   function addQueen() {
      setVisibleQueenCount((count) => Math.max(count, queens.length + 1));
      setQueens((current) => [...current, newQueen()]);
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
      <>
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
            {templateLoading && <div className="notice">{t("loadingTemplate")}</div>}
            {templateLoaded && <div className="notice">{t("templatePhotosHelp")}</div>}
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
            <DndContext id="create-queens" sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragQueen}>
               <SortableContext
                  items={queens.slice(0, visibleQueenCount).map((queen) => queen.id)}
                  strategy={verticalListSortingStrategy}
               >
                  {queens.slice(0, visibleQueenCount).map((queen, index) => (
                     <SortableQueenDraft
                        key={queen.id}
                        queen={queen}
                        index={index}
                        duplicate={duplicateQueens.has(index)}
                        canDelete={queens.length > 2}
                        onChange={(patch) => updateQueen(index, patch)}
                        onPhoto={(event) => pickPhoto(index, event)}
                        onDelete={() => removeQueen(index)}
                        t={t}
                     />
                  ))}
               </SortableContext>
            </DndContext>
            {visibleQueenCount < queens.length && (
               <button
                  type="button"
                  className="btn btn-soft list-more"
                  onClick={() => setVisibleQueenCount((count) => count + QUEEN_PAGE_SIZE)}
               >
                  {t("showMoreQueens", { count: Math.min(QUEEN_PAGE_SIZE, queens.length - visibleQueenCount) })}
               </button>
            )}
            <p className="field-hint">{t("optionalPhotos")}</p>
            <button type="button" className="btn btn-soft" onClick={addQueen}>
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
            <button className="btn btn-primary" disabled={loading || templateLoading || formInvalid}>
               <Sparkles size={18} /> {loading ? t("creatingRoom") : t("createRoom")}
            </button>
         </form>
      </main>
      {photoToCrop && (
         <PhotoCropModal
            source={photoToCrop.source}
            saving={croppingPhoto}
            onCancel={cancelPhotoCrop}
            onConfirm={confirmPhotoCrop}
            t={t}
         />
      )}
      </>
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

async function cropPhoto(file: File, area: Area) {
   const image = await createImageBitmap(file);
   const canvas = document.createElement("canvas");
   canvas.width = CROPPED_IMAGE_SIZE;
   canvas.height = CROPPED_IMAGE_SIZE;
   const context = canvas.getContext("2d");
   if (!context) throw new Error("Canvas is not available");
   context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, CROPPED_IMAGE_SIZE, CROPPED_IMAGE_SIZE);
   image.close();
   const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not crop image")), "image/jpeg", 0.9);
   });
   const baseName = file.name.replace(/\.[^.]+$/, "") || "queen";
   return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}
