import { redirect } from "next/navigation";
import AccessSettings from "@/components/AccessSettings";
import BackButton from "@/components/BackButton";
import PasswordGate from "@/components/PasswordGate";
import SiteHeader from "@/components/SiteHeader";
import { getAccess } from "@/lib/access";
import { getRole } from "@/lib/auth";

export default async function AccessPage() {
  const role = await getRole();
  if (role !== "owner") {
    if (role === "guest") redirect("/");
    return <PasswordGate />;
  }
  const access = await getAccess();
  return (
    <>
      <SiteHeader left={<BackButton />} center={<h1 className="text-base font-bold">Friends&apos; Access</h1>} right={<span className="w-16" aria-hidden />} />
      <div dir="ltr" className="mx-auto max-w-2xl pb-4 pt-4">
        <AccessSettings initial={{ enabled: access.enabled, password: access.password }} />
      </div>
    </>
  );
}
