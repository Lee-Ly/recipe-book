"use client";

import { useRouter } from "next/navigation";
import { btnGhost } from "./ui";

/** "חזור" with the arrow on the left. Goes to the previous page, or to `fallback` when there is none. */
export default function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className={`${btnGhost} gap-2 px-4 font-bold`}
    >
      <span aria-hidden>←</span>
      חזור
    </button>
  );
}
