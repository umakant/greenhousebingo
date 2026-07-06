import type { Metadata } from "next";
import { WaterIceShell } from "@/components/waterice/waterice-shell";
import { MembershipsClient } from "./memberships-client";

export const metadata: Metadata = {
  title: "Memberships — Water Ice Express",
  description: "Weekly and monthly water ice plans with exclusive flavors.",
};

export default function MembershipsPage() {
  return (
    <WaterIceShell>
      <MembershipsClient />
    </WaterIceShell>
  );
}
