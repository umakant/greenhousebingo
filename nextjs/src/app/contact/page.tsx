import type { Metadata } from "next";
import { WaterIceShell } from "@/components/waterice/waterice-shell";
import { ContactClient } from "./contact-client";

export const metadata: Metadata = {
  title: "Contact Us — Water Ice Express",
  description:
    "Get in touch with Water Ice Express LLC. Visit our Knoxville office, send a message, or text our after-hours support line.",
  openGraph: {
    title: "Contact Water Ice Express",
    description:
      "Reach the Water Ice Express team — message us, find us on the map, or text after hours.",
  },
};

export default function ContactPage() {
  return (
    <WaterIceShell>
      <ContactClient />
    </WaterIceShell>
  );
}
