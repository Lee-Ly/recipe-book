"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button type="button" onClick={logout} className="py-1 text-xs font-semibold text-muted transition hover:text-foreground active:text-foreground">
      Log out
    </button>
  );
}
