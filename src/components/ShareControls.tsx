"use client";

import { useState, useSyncExternalStore } from "react";
import { btnGhost, btnPrimary, btnText, inputCls, panelCls } from "./ui";

export default function ShareControls({ id, initialToken }: { id: string; initialToken: string | null }) {
  const [token, setToken] = useState(initialToken);
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function update(enabled: boolean, regenerate = false) {
    setBusy(true);
    const res = await fetch(`/api/recipes/${id}/share`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled, regenerate }),
    });
    if (res.ok) setToken(((await res.json()) as { shareToken: string | null }).shareToken);
    setBusy(false);
  }

  async function share(link: string) {
    // On a phone this opens the native share sheet (WhatsApp, etc.); elsewhere it copies the link.
    if (navigator.share) {
      try {
        await navigator.share({ url: link });
        return;
      } catch {
        return; // cancelled
      }
    }
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!token) {
    return (
      <button type="button" onClick={() => update(true)} disabled={busy} className={`${btnGhost} w-full`}>
        Create share link
      </button>
    );
  }

  const link = `${origin}/s/${token}`;
  return (
    <div className={`flex flex-col gap-3 ${panelCls} p-4`}>
      <p className="text-sm">Anyone with this link can view this recipe, but not change it.</p>
      <input readOnly value={link} dir="ltr" aria-label="Share link" className={`${inputCls} text-sm`} onFocus={(e) => e.currentTarget.select()} />
      <button type="button" onClick={() => share(link)} className={`${btnPrimary} w-full py-2.5`}>
        {copied ? "Copied ✓" : "Send link"}
      </button>
      {origin.includes("localhost") && <p className="text-xs text-muted">This link only works on this computer until the site is online.</p>}
      <div className="flex gap-4">
        <button type="button" onClick={() => update(false)} disabled={busy} className={`${btnText} !text-muted`}>
          Stop sharing
        </button>
        <button type="button" onClick={() => update(true, true)} disabled={busy} className={`${btnText} !text-muted`}>
          New link
        </button>
      </div>
    </div>
  );
}
