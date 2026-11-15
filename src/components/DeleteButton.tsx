"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

export default function DeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setBusy(false);
      setAsking(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setAsking(true)} className="self-start py-1 text-xs font-bold text-red-600 transition hover:underline active:underline">
        Delete recipe
      </button>
      <ConfirmDialog open={asking} title={`Delete "${title}"?`} message="This can't be undone." busy={busy} onConfirm={remove} onCancel={() => setAsking(false)} />
    </>
  );
}
