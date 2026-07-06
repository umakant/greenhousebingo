import type { Metadata } from "next";
import { SiteHeader } from "@/components/waterice/site-header";
import { WaterIceShell } from "@/components/waterice/waterice-shell";

export const metadata: Metadata = {
  title: "Supplies — Water Ice Express",
  description: "Scoopers, spoons, napkins, cups, and equipment for your water ice business.",
};

export default function SuppliesPage() {
  return (
    <WaterIceShell>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-16">
        <h1 className="font-display text-5xl font-extrabold text-foreground">Supplies</h1>
        <p className="mt-3 text-muted-foreground max-w-prose">
          Scoopers, spoons, napkins, cups in four sizes, and water ice equipment to keep your operation running.
        </p>
      </main>
    </WaterIceShell>
  );
}
