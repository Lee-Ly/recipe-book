"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon, XIcon } from "./icons";
import { btnBack } from "./ui";

/**
 * Back to the previous page, or to `fallback` when there is none.
 * "back" is "חזור" with an arrow (recipe page); "cancel" is an X with "Cancel" (new/edit screens), like the mockup.
 */
export default function BackButton({ fallback = "/", variant = "back" }: { fallback?: string; variant?: "back" | "cancel" }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className={btnBack}
    >
      {variant === "back" ? <ArrowLeftIcon /> : <XIcon />}
      {variant === "back" ? "חזור" : "Cancel"}
    </button>
  );
}
