"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, inputCls } from "./ui";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push(next);
      router.refresh();
    } else {
      setError("Wrong password");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-20 flex max-w-xs flex-col gap-4">
      <h1 dir="ltr" className="text-center text-3xl font-bold tracking-tight">
        Recipe Book<span className="text-accent">.</span>
      </h1>
      <input
        id="password"
        type="password"
        autoFocus
        autoComplete="current-password"
        aria-label="Password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={inputCls}
      />
      {error && (
        <p role="alert" className="text-center text-sm text-red-600">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !password} className={btnPrimary}>
        {busy ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
