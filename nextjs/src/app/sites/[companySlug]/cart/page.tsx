import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { CompanySiteCartClient } from "@/components/company-site/company-site-cart-client";
import { CompanySitePageShell } from "@/components/company-site/company-site-page-shell";
import { getCompanyWebsiteAccessLabel } from "@/lib/company-themes/company-website-access";
import {
  companySiteAccessUrl,
  resolveCompanySiteBasePath,
} from "@/lib/company-themes/company-website-custom-domain";
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
  return { title: `Cart — ${label}` };
}

export default async function CompanySiteCartPage({ params }: Props) {
  const { companySlug } = await params;
  const ownerId = await findCompanyOwnerIdByPublicSlug(companySlug);
  if (!ownerId) {
    return <main className="p-8">Company site not found.</main>;
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const siteBase = await resolveCompanySiteBasePath(ownerId, companySlug, host);
  if (await isCompanyWebsiteAccessBlocked(ownerId, companySlug)) {
    redirect(companySiteAccessUrl(siteBase, `${siteBase || ""}/cart`));
  }

  const chrome = await renderCompanyWebsiteChrome(ownerId, siteBase);

  return (
    <CompanySitePageShell chrome={chrome} companySlug={companySlug} siteBase={siteBase}>
      <CompanySiteCartClient companySlug={companySlug} siteBase={siteBase} />
    </CompanySitePageShell>
  );
}
