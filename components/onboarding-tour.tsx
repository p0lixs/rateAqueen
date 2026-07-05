"use client";

import { useEffect, useState } from "react";
import { BarChart3, Crown, DoorOpen, PlusCircle, X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

export default function OnboardingTour({ open, onComplete }: { open: boolean; onComplete: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const slides = [
    { icon: Crown, color: "pink", title: t("tourWelcomeTitle"), text: t("tourWelcomeText") },
    { icon: PlusCircle, color: "purple", title: t("tourCreateTitle"), text: t("tourCreateText") },
    { icon: DoorOpen, color: "orange", title: t("tourVoteTitle"), text: t("tourVoteText") },
    { icon: BarChart3, color: "green", title: t("tourResultsTitle"), text: t("tourResultsText") },
  ];
  useEffect(() => { if (open) { setStep(0); document.body.style.overflow = "hidden"; } return () => { document.body.style.overflow = ""; }; }, [open]);
  if (!open) return null;
  const slide = slides[step];
  const Icon = slide.icon;
  const last = step === slides.length - 1;

  return <div className="tour-backdrop">
    <section className="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <button className="modal-close" onClick={onComplete} aria-label={t("close")}><X size={18} /></button>
      <div className={`tour-visual ${slide.color}`}><span><Icon size={52} /></span><i /><i /><i /></div>
      <div className="tour-progress" aria-label={`${step + 1}/${slides.length}`}>{slides.map((_, index) => <span className={index === step ? "active" : ""} key={index} />)}</div>
      <p className="eyebrow">{t("tourStep", { current: step + 1, total: slides.length })}</p>
      <h2 id="tour-title">{slide.title}</h2>
      <p className="tour-text">{slide.text}</p>
      <div className="tour-actions">
        {!last && <button className="tour-skip" onClick={onComplete}>{t("tourSkip")}</button>}
        {step > 0 && <button className="btn btn-soft" onClick={() => setStep(step - 1)}>{t("tourBack")}</button>}
        <button className="btn btn-dark" onClick={() => last ? onComplete() : setStep(step + 1)}>{last ? t("tourStart") : t("tourNext")}</button>
      </div>
    </section>
  </div>;
}
