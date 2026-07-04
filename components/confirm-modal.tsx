"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmModal({ open, title, description, confirmLabel, tone = "primary", loading = false, onConfirm, onClose }: ConfirmModalProps) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", handleKey); };
  }, [open, loading, onClose]);

  if (!open) return null;
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}>
    <section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
      <button className="modal-close" onClick={onClose} disabled={loading} aria-label={t("modalClose")}><X size={18} /></button>
      <span className={`modal-icon ${tone}`}><AlertTriangle size={22} /></span>
      <h3 id="confirm-title">{title}</h3>
      <p id="confirm-description">{description}</p>
      <div className="modal-actions">
        <button className="btn btn-modal-cancel" onClick={onClose} disabled={loading}>{t("cancel")}</button>
        <button className={`btn ${tone === "danger" ? "btn-modal-danger" : "btn-modal-primary"}`} onClick={onConfirm} disabled={loading}>{loading ? t("waiting") : confirmLabel}</button>
      </div>
    </section>
  </div>;
}
