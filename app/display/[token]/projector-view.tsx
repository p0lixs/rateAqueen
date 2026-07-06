"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Crown, Hourglass, Vote } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

type DisplayData = { title: string; status: "registration" | "voting" | "results"; members: number; votes: number };

export default function ProjectorView({ token }: { token: string }) {
  const { t } = useI18n();
  const [data, setData] = useState<DisplayData | null>(null);
  const [qr, setQr] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/display/${token}`, { cache: "no-store" });
    if (response.ok) setData(await response.json());
  }, [token]);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 5_000);
    return () => window.clearInterval(interval);
  }, [load]);
  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/join/${token}`, { width: 560, margin: 2, color: { dark: "#241927", light: "#ffffff" } }).then(setQr);
  }, [token]);

  if (!data) return <div className="spinner" />;
  const statusText = data.status === "registration" ? t("registrationOpen") : data.status === "voting" ? t("votingOpen") : t("published");
  return <main className="projector">
    <div className="projector-brand"><Crown /> Rate a Queen</div>
    <section className="projector-content">
      <div><p className="eyebrow">{statusText}</p><h1>{data.title}</h1><p className="projector-lead">{data.status === "registration" ? t("scanToRegister") : data.status === "voting" ? t("scanToVote") : t("resultsReady")}</p><div className="projector-stats"><span><Hourglass /> {data.members} {t("registeredPeople")}</span>{data.status !== "registration" && <span><Vote /> {data.votes} {t("votesReceived")}</span>}</div></div>
      {data.status !== "results" && qr && <div className="qr-card"><img src={qr} alt={t("roomQr")} /><strong>{t("scanQr")}</strong></div>}
    </section>
  </main>;
}
