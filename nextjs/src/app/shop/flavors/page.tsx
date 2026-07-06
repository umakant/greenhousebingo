import type { Metadata } from "next";
import { WaterIceShell } from "@/components/waterice/waterice-shell";
import { getWaterIceFlavors } from "@/lib/waterice/flavors-catalog";
import { FlavorsClient } from "./flavors-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Flavors — Water Ice Express",
  description: "Browse all premium water ice flavors for wholesale and distributor orders.",
};

export default async function FlavorsPage() {
  const flavors = await getWaterIceFlavors();
  return (
    <WaterIceShell>
      <FlavorsClient flavors={flavors} />
    </WaterIceShell>
  );
}
