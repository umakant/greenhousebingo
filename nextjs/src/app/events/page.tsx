import type { Metadata } from "next";
import { WaterIceShell } from "@/components/waterice/waterice-shell";
import { EventsClient } from "./events-client";

export const metadata: Metadata = {
  title: "Events — Water Ice Express",
  description:
    "Browse upcoming Water Ice Express events. Click any date for full details, time, and location.",
};

export default function EventsPage() {
  return (
    <WaterIceShell>
      <EventsClient />
    </WaterIceShell>
  );
}
