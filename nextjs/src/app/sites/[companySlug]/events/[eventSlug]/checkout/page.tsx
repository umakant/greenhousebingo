import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PlantBingoCheckoutClient } from "@/components/company-site/plant-bingo-checkout-client";
import { CompanySitePageShell } from "@/components/company-site/company-site-page-shell";
import {
  companySiteAccessUrl,
  resolveCompanySiteBasePath,
} from "@/lib/company-themes/company-website-custom-domain";
import { getCompanyWebsiteAccessLabel } from "@/lib/company-themes/company-website-access";
import { findCompanyOwnerIdByPublicSlug } from "@/lib/company-themes/company-website-host-resolver";
import { isCompanyWebsiteAccessBlocked } from "@/lib/company-themes/company-website-password";
import { renderCompanyWebsiteChrome } from "@/lib/company-themes/company-website-render";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ companySlug: string; eventSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { companySlug, eventSlug } = await params;
  const ownerId = await findCompanyOwnerIdByPublicSlug(companySlug);
  const label = ownerId
    ? await getCompanyWebsiteAccessLabel(ownerId, companySlug)
    : companySlug;
  return { title: `Checkout — ${eventSlug} — ${label}` };
}

export default async function PlantBingoEventCheckoutPage({ params }: Props) {
  const { companySlug, eventSlug } = await params;
  const ownerId = await findCompanyOwnerIdByPublicSlug(companySlug);
  if (!ownerId) {
    return <main className="p-8">Company site not found.</main>;
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const siteBase = await resolveCompanySiteBasePath(ownerId, companySlug, host);
  if (await isCompanyWebsiteAccessBlocked(ownerId, companySlug)) {
    redirect(
      companySiteAccessUrl(
        siteBase,
        `${siteBase || ""}/events/${encodeURIComponent(eventSlug)}/checkout`,
      ),
    );
  }

  const chrome = await renderCompanyWebsiteChrome(ownerId, siteBase);

  return (
    <CompanySitePageShell chrome={chrome} companySlug={companySlug} siteBase={siteBase}>
      <Suspense fallback={<main className="p-8">Loading checkout…</main>}>
        <PlantBingoCheckoutClient
          companySlug={companySlug}
          eventSlug={eventSlug}
          siteBase={siteBase}
        />
      </Suspense>
    </CompanySitePageShell>
  );
}
