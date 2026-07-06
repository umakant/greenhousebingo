import type { Metadata } from "next";
import { headers } from "next/headers";

import { CompanySiteAccessClient } from "@/components/company-site/company-site-access-client";
import { getCompanyWebsiteAccessLabel } from "@/lib/company-themes/company-website-access";
import { resolveCompanySiteBasePath } from "@/lib/company-themes/company-website-custom-domain";
import { findCompanyOwnerIdByPublicSlug } from "@/lib/company-themes/company-website-host-resolver";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ next?: string }>;
};

function resolveAccessNextPath(
  rawNext: string | undefined,
  siteBase: string,
  companySlug: string,
): string {
  const fallback = siteBase || "/";
  const next = (rawNext ?? "").trim();
  if (!next) return fallback;

  const slugPrefix = `/sites/${encodeURIComponent(companySlug)}`;
  if (siteBase && next.startsWith(siteBase)) return next;
  if (!siteBase) {
    if (next.startsWith(slugPrefix)) return next.slice(slugPrefix.length) || "/";
    if (next.startsWith("/")) return next;
  }
  if (next.startsWith(slugPrefix)) return next;
  return fallback;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { companySlug } = await params;
  const ownerId = await findCompanyOwnerIdByPublicSlug(companySlug);
  const label = ownerId
    ? await getCompanyWebsiteAccessLabel(ownerId, companySlug)
    : companySlug;
  return { title: `Access — ${label}` };
}

export default async function CompanySiteAccessPage({ params, searchParams }: Props) {
  const { companySlug } = await params;
  const { next } = await searchParams;
  const ownerId = await findCompanyOwnerIdByPublicSlug(companySlug);
  if (!ownerId) {
    return <main className="p-8">Company site not found.</main>;
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const siteBase = await resolveCompanySiteBasePath(ownerId, companySlug, host);
  const nextPath = resolveAccessNextPath(next, siteBase, companySlug);
  const companyName = await getCompanyWebsiteAccessLabel(ownerId, companySlug);

  return (
    <CompanySiteAccessClient
      companySlug={companySlug}
      companyName={companyName}
      nextPath={nextPath}
      siteBase={siteBase}
    />
  );
}
