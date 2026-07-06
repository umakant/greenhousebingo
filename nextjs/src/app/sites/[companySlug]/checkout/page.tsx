import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CompanySiteCheckoutClient } from "@/components/company-site/company-site-checkout-client";
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

type Props = { params: Promise<{ companySlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { companySlug } = await params;
  const ownerId = await findCompanyOwnerIdByPublicSlug(companySlug);
  const label = ownerId
    ? await getCompanyWebsiteAccessLabel(ownerId, companySlug)
    : companySlug;
  return { title: `Checkout — ${label}` };
}

export default async function CompanySiteCheckoutPage({ params }: Props) {
  const { companySlug } = await params;
  const ownerId = await findCompanyOwnerIdByPublicSlug(companySlug);
  if (!ownerId) {
    return <main className="p-8">Company site not found.</main>;
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const siteBase = await resolveCompanySiteBasePath(ownerId, companySlug, host);
  if (await isCompanyWebsiteAccessBlocked(ownerId, companySlug)) {
    redirect(companySiteAccessUrl(siteBase, `${siteBase || ""}/checkout`));
  }

  const chrome = await renderCompanyWebsiteChrome(ownerId, siteBase);

  return (
    <CompanySitePageShell chrome={chrome} companySlug={companySlug} siteBase={siteBase}>
      <Suspense fallback={<main className="p-8">Loading checkout…</main>}>
        <CompanySiteCheckoutClient companySlug={companySlug} siteBase={siteBase} />
      </Suspense>
    </CompanySitePageShell>
  );
}
