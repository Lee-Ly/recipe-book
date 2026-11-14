"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnText } from "./ui";

export default function DeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={remove} disabled={busy} className={`${btnText} self-start text-red-600`}>
      Delete recipe
    </button>
  );
}
