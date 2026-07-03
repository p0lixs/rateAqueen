"use client";

import { useEffect, useState } from "react";
import { Crown, Trophy } from "lucide-react";
import type { Result } from "@/lib/types";

export default function ResultsView({ token }: { token: string }) {
  const [data, setData] = useState<{ title: string; votes: number; results: Result[] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/results/${token}`, { cache: "no-store" }).then(async (response) => {
      const json = await response.json();
      if (!response.ok) setError(json.error || "No se pueden mostrar los resultados");
      else setData(json);
    });
  }, [token]);
  if (error) return <main className="shell"><div className="notice error">{error}</div></main>;
  if (!data) return <div className="spinner" />;
  return (
    <main className="shell">
      <div className="brand"><span className="brand-mark"><Crown size={18} /></span> Rate a Queen</div>
      <section className="vote-head"><p className="eyebrow"><Trophy size={13} /> Clasificación final</p><h1>{data.title}</h1><p className="lede">Resultado calculado con {data.votes} votos anónimos.</p></section>
      <div className="podium">
        {data.results.map((queen, index) => (
          <div className="result-row" key={queen.id}>
            <span className="rank">{index + 1}</span>
            <img className="queen-photo" src={queen.image_url} alt={queen.name} />
            <span className="queen-name">{queen.name}</span>
            <span className="score"><strong>{queen.average.toFixed(2)}</strong><small>puntos</small></span>
          </div>
        ))}
      </div>
      <p className="privacy">Puntuación: la primera recibe tantos puntos como reinas participan; cada posición siguiente recibe un punto menos.</p>
    </main>
  );
}
