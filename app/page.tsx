"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { Crown, ImagePlus, Plus, Sparkles, Trash2 } from "lucide-react";

type QueenDraft = { name: string; file?: File; preview?: string };
type PersonDraft = { name: string; nickname: string };

export default function Home() {
  const [title, setTitle] = useState("");
  const [queens, setQueens] = useState<QueenDraft[]>([{ name: "" }, { name: "" }, { name: "" }]);
  const [people, setPeople] = useState<PersonDraft[]>([{ name: "", nickname: "" }, { name: "", nickname: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    if (queens.some((queen) => !queen.name.trim() || !queen.file)) {
      return setError("Añade el nombre y una foto para cada reina.");
    }
    if (people.some((person) => !person.name.trim() || !person.nickname.trim())) {
      return setError("Añade el nombre y el apodo de cada participante.");
    }

    setLoading(true);
    const form = new FormData();
    form.set("title", title.trim());
    form.set("queens", JSON.stringify(queens.map((queen) => ({ name: queen.name.trim() }))));
    form.set("people", JSON.stringify(people.map((person) => ({ name: person.name.trim(), nickname: person.nickname.trim() }))));
    queens.forEach((queen, index) => form.set(`photo_${index}`, queen.file!));

    try {
      const response = await fetch("/api/events", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo crear la partida");
      window.location.href = `/manage/${data.adminToken}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ha ocurrido un error");
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <div className="brand"><span className="brand-mark"><Crown size={18} /></span> Rate a Queen</div>
      <section className="hero">
        <p className="eyebrow">The ranking game</p>
        <h1>Que gane<br /><em>la mejor.</em></h1>
        <p className="lede">Crea tu elenco, invita a tus amigas y descubrid el ranking del grupo. Cada voto es secreto. El resultado aparece cuando todas hayan votado.</p>
      </section>

      <form className="card" onSubmit={submit}>
        <p className="eyebrow">Nueva partida</p>
        <div className="field">
          <label htmlFor="title">Nombre de la edición</label>
          <input id="title" className="input" placeholder="Ej. All Stars: episodio 4" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} />
        </div>

        <div className="section-title"><h3>Las reinas</h3><span className="count">{queens.length} reinas</span></div>
        {queens.map((queen, index) => (
          <div className="repeat-row" key={index}>
            <label className="photo-input" title="Añadir foto">
              {queen.preview ? <img src={queen.preview} alt="" /> : <ImagePlus size={20} />}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => pickPhoto(index, event)} />
            </label>
            <input className="input" placeholder={`Reina ${index + 1}`} value={queen.name} onChange={(e) => updateQueen(index, { name: e.target.value })} maxLength={60} />
            <button type="button" className="icon-btn" aria-label="Eliminar reina" disabled={queens.length <= 2} onClick={() => setQueens(queens.filter((_, i) => i !== index))}><Trash2 size={18} /></button>
          </div>
        ))}
        <button type="button" className="btn btn-soft" onClick={() => setQueens([...queens, { name: "" }])}><Plus size={16} /> Añadir reina</button>

        <div className="section-title"><h3>Participantes</h3><span className="count">Recibirán enlaces únicos</span></div>
        {people.map((person, index) => (
          <div className="repeat-row person-row" key={index}>
            <input className="input" placeholder="Nombre" value={person.name} onChange={(e) => setPeople(people.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} maxLength={60} />
            <input className="input nickname" placeholder="Apodo" value={person.nickname} onChange={(e) => setPeople(people.map((item, i) => i === index ? { ...item, nickname: e.target.value } : item))} maxLength={60} />
            <button type="button" className="icon-btn" aria-label="Eliminar participante" disabled={people.length <= 1} onClick={() => setPeople(people.filter((_, i) => i !== index))}><Trash2 size={18} /></button>
          </div>
        ))}
        <button type="button" className="btn btn-soft" onClick={() => setPeople([...people, { name: "", nickname: "" }])}><Plus size={16} /> Añadir persona</button>

        {error && <div className="notice error">{error}</div>}
        <button className="btn btn-primary" disabled={loading}><Sparkles size={18} /> {loading ? "Creando la partida…" : "Crear partida"}</button>
      </form>
    </main>
  );
}
