import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WaterIceShell } from "@/components/waterice/waterice-shell";
import { flavorSlug } from "@/data/waterice/flavors";
import { getWaterIceFlavors, relatedFlavors } from "@/lib/waterice/flavors-catalog";
import { FlavorDetailClient } from "./flavor-detail-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const all = await getWaterIceFlavors();
  const f = all.find((x) => x.slug === slug) ?? all.find((x) => flavorSlug(x.name) === slug);
  if (!f) return { title: "Flavor — Water Ice Express" };
  return {
    title: `${f.name} — Water Ice Express Flavors`,
    description: f.description,
  };
}

export default async function FlavorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const all = await getWaterIceFlavors();
  const flavor = all.find((f) => f.slug === slug) ?? all.find((f) => flavorSlug(f.name) === slug);
  if (!flavor) notFound();
  const related = relatedFlavors(all, flavor, 3);

  return (
    <WaterIceShell>
      <FlavorDetailClient flavor={flavor} related={related} />
    </WaterIceShell>
  );
}
