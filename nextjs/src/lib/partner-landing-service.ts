import "server-only";

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/partner-service";

export async function nextPartnerLandingPageId(): Promise<bigint> {
  const agg = await prisma.partnerLandingPage.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

export async function ensureUniqueLandingSlug(partnerId: bigint, base: string): Promise<string> {
  const root = slugify(base) || `page-${Date.now().toString(36)}`;
  let candidate = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.partnerLandingPage.findFirst({
      where: { partnerId, slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

export function serializeLandingPage(p: {
  id: bigint;
  partnerId: bigint;
  title: string;
  slug: string;
  headline: string | null;
  subheadline: string | null;
  industryModule: string | null;
  logo: string | null;
  description: string | null;
  callToActionText: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date | null;
}) {
  return {
    id: p.id.toString(),
    partnerId: p.partnerId.toString(),
    title: p.title,
    slug: p.slug,
    headline: p.headline,
    subheadline: p.subheadline,
    industryModule: p.industryModule,
    logo: p.logo,
    description: p.description,
    callToActionText: p.callToActionText,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null,
  };
}
