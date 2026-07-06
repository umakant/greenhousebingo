import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import PartnerLandingView from "@/components/partner-public/partner-landing-view";
import SetPartnerRefCookie from "@/components/partner-public/set-partner-ref-cookie";

export const dynamic = "force-dynamic";

export default async function PartnerReferralLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const partner = await prisma.partner.findFirst({
    where: { slug, status: "active" },
    select: { slug: true, name: true, brandName: true },
  });
  if (!partner) notFound();

  const brandName = partner.brandName || partner.name;

  return (
    <>
      <SetPartnerRefCookie slug={partner.slug} />
      <PartnerLandingView
        partnerSlug={partner.slug}
        brandName={brandName}
        headline={`Grow your business with ${brandName}`}
        subheadline="Get started with a powerful all-in-one platform, recommended by our partner."
        callToActionText="Create your account"
      />
    </>
  );
}
