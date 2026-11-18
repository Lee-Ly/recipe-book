import BackButton from "@/components/BackButton";
import ManageTaxonomy from "@/components/ManageTaxonomy";
import SiteHeader from "@/components/SiteHeader";
import { getRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import PasswordGate from "@/components/PasswordGate";
import { getTaxonomy, listRecipes } from "@/lib/store";

export default async function ManagePage() {
  const role = await getRole();
  if (role !== "owner") {
    if (role === "guest") redirect("/");
    return <PasswordGate />;
  }
  const [taxonomy, recipes] = await Promise.all([getTaxonomy(), listRecipes()]);
  const categoryCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  for (const r of recipes) {
    for (const id of r.categories) categoryCounts[id] = (categoryCounts[id] ?? 0) + 1;
    for (const t of r.tags) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
  }
  return (
    <>
      <SiteHeader left={<BackButton />} center={<h1 className="text-base font-bold">Categories &amp; Tags</h1>} right={<span className="w-16" aria-hidden />} />
      <div dir="ltr" className="mx-auto max-w-2xl pb-4 pt-4">
        <ManageTaxonomy initial={taxonomy} categoryCounts={categoryCounts} tagCounts={tagCounts} />
      </div>
    </>
  );
}
