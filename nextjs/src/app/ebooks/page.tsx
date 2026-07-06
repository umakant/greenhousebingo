import type { Metadata } from "next";
import { WaterIceShell } from "@/components/waterice/waterice-shell";
import { getWaterIceEbooks } from "@/lib/waterice/ebooks-catalog";
import { EbooksClient } from "./ebooks-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "eBooks — Water Ice Express",
  description: "Educational eBooks to help you launch and grow your water ice business.",
};

export default async function EbooksPage() {
  const books = await getWaterIceEbooks();
  return (
    <WaterIceShell>
      <EbooksClient books={books} />
    </WaterIceShell>
  );
}
