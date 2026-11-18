"use client";

import { useState, useSyncExternalStore } from "react";
import ConfirmDialog from "./ConfirmDialog";
import { btnDark, btnGhost, btnPrimary, fieldLabel, inputCls, panelCls, rowCls } from "./ui";

interface State {
  enabled: boolean;
  password: string;
}

const noSubscribe = () => () => {};
const origin = () => window.location.origin;

/** The owner's control for the password friends use to view the site. */
export default function AccessSettings({ initial }: { initial: State }) {
  const [state, setState] = useState<State>(initial);
  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const site = useSyncExternalStore(noSubscribe, origin, () => "");

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/access", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = (await res.json()) as State & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Couldn't save.");
      setState({ enabled: json.enabled, password: json.password });
      setDraft("");
      setMessage(body.op === "disable" ? "Friends' access is off. Everyone who had the password was signed out." : "Saved. Everyone who had the old password was signed out and needs the new one.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${what} copied.`);
      setError("");
    } catch {
      setError("Couldn't copy. Select the text and copy it by hand.");
    }
  }

  const invitation = `היי! הנה ספר המתכונים שלי: ${site}\nהסיסמה: ${state.password}`;

  return (
    <div className="space-y-5">
      {(message || error) && (
        <p role={error ? "alert" : "status"} className={`rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-line bg-accent-soft text-ink-2"}`}>
          {error || message}
        </p>
      )}

      <section className={`${panelCls} space-y-3 p-4`}>
        <div>
          <h2 className="text-sm font-bold">Friends&apos; access is {state.enabled ? "on" : "off"}</h2>
          <p className="text-[11px] text-muted">
            Friends who enter the friends&apos; password can view all the recipes. They can&apos;t change anything, and they don&apos;t see your notes or favorites. Your own password still gives you full access.
          </p>
        </div>

        {state.enabled && (
          <div className="space-y-2">
            <div>
              <span className={fieldLabel}>Site address</span>
              <div className={`flex items-center gap-2 p-2 ${rowCls}`}>
                <span dir="ltr" className="min-w-0 flex-1 truncate px-1.5 text-sm font-medium">
                  {site}
                </span>
                <button type="button" onClick={() => copy(site, "Address")} className={btnGhost}>
                  Copy
                </button>
              </div>
            </div>
            <div>
              <span className={fieldLabel}>Friends&apos; password</span>
              <div className={`flex items-center gap-2 p-2 ${rowCls}`}>
                <span dir="ltr" className="min-w-0 flex-1 truncate px-1.5 text-sm font-bold tracking-wide">
                  {state.password}
                </span>
                <button type="button" onClick={() => copy(state.password, "Password")} className={btnGhost}>
                  Copy
                </button>
              </div>
            </div>
            <button type="button" onClick={() => copy(invitation, "Invitation")} className={`${btnPrimary} w-full py-2.5`}>
              Copy invitation (address and password)
            </button>
          </div>
        )}
      </section>

      <section className={`${panelCls} space-y-3 p-4`}>
        <div>
          <h2 className="text-sm font-bold">{state.enabled ? "Change the password" : "Turn on friends' access"}</h2>
          <p className="text-[11px] text-muted">{state.enabled ? "Changing it signs every friend out until they enter the new password." : "Choose a password to give to your friends (at least 6 characters), or let the site make one."}</p>
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) void send({ op: "set", password: draft });
          }}
        >
          <input dir="ltr" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="New friends' password" aria-label="New friends' password" autoComplete="off" className={`${inputCls} min-w-0 flex-1 py-2`} />
          <button type="submit" disabled={busy || !draft.trim()} className={btnDark}>
            {state.enabled ? "Save" : "Turn on"}
          </button>
        </form>
        <button type="button" disabled={busy} onClick={() => send({ op: "generate" })} className={`${btnGhost} w-full`}>
          Make a new random password
        </button>
        {state.enabled && (
          <button type="button" disabled={busy} onClick={() => setAsking(true)} className="py-1 text-xs font-bold text-red-600 transition hover:underline active:underline">
            Turn off friends&apos; access
          </button>
        )}
      </section>

      <ConfirmDialog
        open={asking}
        title="Turn off friends' access?"
        message="Your friends will be signed out and can't open the site until you turn it on again with a password."
        confirmLabel="Turn off"
        busy={busy}
        onConfirm={async () => {
          await send({ op: "disable" });
          setAsking(false);
        }}
        onCancel={() => setAsking(false)}
      />
    </div>
  );
}
