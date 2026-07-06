import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WaterIceShell } from "@/components/waterice/waterice-shell";
import { getWaterIceEbooks, relatedBooks } from "@/lib/waterice/ebooks-catalog";
import { EbookDetailClient } from "./ebook-detail-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const all = await getWaterIceEbooks();
  const b = all.find((x) => x.slug === slug);
  if (!b) return { title: "eBook — Water Ice Express" };
  return {
    title: `${b.title} — Water Ice Express eBooks`,
    description: b.tagline,
    openGraph: {
      title: `${b.title} — Water Ice Express`,
      description: b.tagline,
      images: [b.cover],
    },
  };
}

export default async function EbookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const all = await getWaterIceEbooks();
  const book = all.find((b) => b.slug === slug);
  if (!book) notFound();
  const related = relatedBooks(all, book, 3);

  return (
    <WaterIceShell>
      <EbookDetailClient book={book} related={related} books={all} />
    </WaterIceShell>
  );
}
