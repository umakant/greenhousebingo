import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import PartnerLandingView from "@/components/partner-public/partner-landing-view";
import SetPartnerRefCookie from "@/components/partner-public/set-partner-ref-cookie";

export const dynamic = "force-dynamic";

export default async function PartnerBrandedLandingPage({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}) {
  const { slug, page } = await params;

  const partner = await prisma.partner.findFirst({
    where: { slug, status: "active" },
    select: { id: true, slug: true, name: true, brandName: true },
  });
  if (!partner) notFound();

  const landing = await prisma.partnerLandingPage.findFirst({
    where: { partnerId: partner.id, slug: page, status: "active" },
  });
  if (!landing) notFound();

  const brandName = partner.brandName || partner.name;

  return (
    <>
      <SetPartnerRefCookie slug={partner.slug} />
      <PartnerLandingView
        partnerSlug={partner.slug}
        brandName={brandName}
        logo={landing.logo}
        title={landing.title}
        headline={landing.headline}
        subheadline={landing.subheadline}
        description={landing.description}
        industryModule={landing.industryModule}
        callToActionText={landing.callToActionText}
      />
    </>
  );
}
