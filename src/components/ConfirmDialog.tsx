"use client";

import { useEffect } from "react";
import { btnGhost } from "./ui";

/**
 * A popup that asks before something is deleted. Unlike window.confirm, it is drawn by the page,
 * so it also shows on phones and in in-app browsers that block system alerts.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-5" onClick={onCancel}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 id="confirm-title" dir="auto" className="text-base font-bold">
          {title}
        </h2>
        {message && (
          <p dir="auto" className="mt-1.5 text-sm text-muted">
            {message}
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <button type="button" autoFocus onClick={onCancel} className={`${btnGhost} flex-1`}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="inline-flex flex-1 items-center justify-center rounded-xl bg-red-600 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-red-700 active:bg-red-700 disabled:opacity-50">
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
