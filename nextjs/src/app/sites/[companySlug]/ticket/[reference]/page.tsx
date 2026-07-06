import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CompanySiteTicketClient } from "@/components/company-site/company-site-ticket-client";
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

type Props = {
  params: Promise<{ companySlug: string; reference: string }>;
  searchParams: Promise<{ email?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { companySlug } = await params;
  const ownerId = await findCompanyOwnerIdByPublicSlug(companySlug);
  const label = ownerId ? await getCompanyWebsiteAccessLabel(ownerId, companySlug) : companySlug;
  return { title: `Workshop Ticket — ${label}` };
}

export default async function CompanySiteTicketPage({ params, searchParams }: Props) {
  const { companySlug, reference } = await params;
  const { email } = await searchParams;
  const ownerId = await findCompanyOwnerIdByPublicSlug(companySlug);
  if (!ownerId) {
    return <main className="p-8">Company site not found.</main>;
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const siteBase = await resolveCompanySiteBasePath(ownerId, companySlug, host);
  if (await isCompanyWebsiteAccessBlocked(ownerId, companySlug)) {
    redirect(companySiteAccessUrl(siteBase, `${siteBase || ""}/ticket/${encodeURIComponent(reference)}`));
  }

  const chrome = await renderCompanyWebsiteChrome(ownerId, siteBase);

  return (
    <CompanySitePageShell chrome={chrome} companySlug={companySlug} siteBase={siteBase}>
      <Suspense fallback={<main className="p-8">Loading ticket…</main>}>
        <CompanySiteTicketClient
          companySlug={companySlug}
          reference={reference}
          siteBase={siteBase}
          initialEmail={email}
        />
      </Suspense>
    </CompanySitePageShell>
  );
}
