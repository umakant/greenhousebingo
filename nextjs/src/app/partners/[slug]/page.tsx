import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GhBingoShell } from "@/components/greenhouse-bingo/gh-bingo-shell";
import { CompanyDetailContent } from "@/components/greenhouse-bingo/company-detail";
import { companies, getCompany } from "@/lib/greenhouse-bingo/mock";

export async function generateStaticParams() {
  return companies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = getCompany(slug);
  if (!company) return { title: "Partner — Greenhouse Bingo" };
  return {
    title: `${company.name} — Greenhouse Bingo`,
    description: company.tagline,
  };
}

export default async function PartnerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = getCompany(slug);
  if (!company) notFound();

  return (
    <GhBingoShell>
      <CompanyDetailContent company={company} />
    </GhBingoShell>
  );
}
