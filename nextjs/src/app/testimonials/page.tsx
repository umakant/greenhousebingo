import type { Metadata } from "next";
import { WaterIceShell } from "@/components/waterice/waterice-shell";
import { TestimonialsClient } from "./testimonials-client";

export const metadata: Metadata = {
  title: "Testimonial Board — Water Ice Express",
  description:
    "A Pinterest-style wall of stories, photos, and shout-outs from the Water Ice Express community.",
};

export default function TestimonialsPage() {
  return (
    <WaterIceShell>
      <TestimonialsClient />
    </WaterIceShell>
  );
}
