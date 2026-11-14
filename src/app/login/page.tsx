import LoginForm from "@/components/LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const raw = (await searchParams).next;
  const next = typeof raw === "string" ? raw : "/";
  // Only same-site paths, so a crafted link can't send you elsewhere after logging in.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return <LoginForm next={safeNext} />;
}
