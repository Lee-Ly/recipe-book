"use client";

import { useRouter } from "next/navigation";
import { btnText } from "./ui";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button type="button" onClick={logout} className={`${btnText} text-muted`}>
      Log out
    </button>
  );
}
