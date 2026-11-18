"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SiteHeader from "./SiteHeader";
import { btnPrimary, headerTitleCls, inputCls } from "./ui";

/**
 * Shown instead of any page when the visitor has not entered a password yet: a password window on top of
 * a blurred, empty copy of the site. No recipe data is sent to the browser until the password is right.
 * The same window takes the owner's password and the friends' password.
 */
export default function PasswordGate({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    if (res.ok) {
      // Same address, now with the real page: the server answers with the site this time.
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } else {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? "Wrong password");
      setBusy(false);
    }
  }

  return (
    <>
      {/* An empty outline of the site behind the window (decoration only, no real content). */}
      <div aria-hidden className="pointer-events-none select-none">
        <SiteHeader
          left={
            <span className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-sm font-bold text-background">R.</span>
              <span className={headerTitleCls}>
                Recipe Book<span className="text-accent">.</span>
              </span>
            </span>
          }
        />
        <div className="space-y-5 pt-4">
          <div className="h-[46px] rounded-xl border border-line bg-accent-soft" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-2xl border border-line bg-card p-3">
                <div className="aspect-[4/3] rounded-xl bg-accent-soft" />
                <div className="mt-3 h-3 w-3/4 rounded bg-accent-soft" />
                <div className="mt-2 h-3 w-1/2 rounded bg-accent-soft" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/60 p-5 backdrop-blur-md">
        <form onSubmit={submit} role="dialog" aria-modal="true" aria-label="Password" className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-card p-6 shadow-xl">
          <h1 dir="ltr" className="text-center text-2xl font-bold tracking-tight">
            Recipe Book<span className="text-accent">.</span>
          </h1>
          <p className="text-center text-sm text-muted">Enter the password to open the recipe book.</p>
          <input
            type="password"
            dir="ltr"
            autoFocus
            autoComplete="current-password"
            aria-label="Password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
          {error && (
            <p role="alert" className="text-center text-xs font-semibold text-red-600">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy || !password} className={`${btnPrimary} w-full py-3 text-sm`}>
            {busy ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    </>
  );
}
