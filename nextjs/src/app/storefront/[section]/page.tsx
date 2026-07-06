import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { StorefrontMerchantShell } from "@/components/storefront/storefront-merchant-shell";
import { STOREFRONT_MERCHANT_SECTIONS } from "@/components/storefront/storefront-sections";
import { StorefrontSectionContent } from "@/components/storefront/storefront-section-content";
import { StorefrontSetupNoOrganization } from "@/components/storefront/storefront-setup-empty-state";
import { StorefrontSetupOverview } from "@/components/storefront/storefront-setup-overview";
import { StorefrontOnboardingWizard } from "@/components/storefront/storefront-onboarding-wizard";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { requireStorefrontPageAccess } from "@/lib/require-storefront-page";
import { STOREFRONT_PERMISSION, userHasStorefrontPermission } from "@/lib/storefront-permissions";
import { loadStorefrontSetupOverviewForMerchantUi } from "@/lib/storefront/setup-overview-server";
import { t } from "@/lib/admin-t";


const VALID = new Set<string>(STOREFRONT_MERCHANT_SECTIONS.map((s) => s.id));

const SECTION_TITLES: Record<string, string> = Object.fromEntries(
  STOREFRONT_MERCHANT_SECTIONS.map((s) => [s.id, t(s.title)]),
);

export default async function StorefrontSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ websiteId?: string }>;
}) {
  const { section } = await params;
  const sp = await searchParams;
  const path = `/storefront/${section}`;

  const u = await requireStorefrontPageAccess(path, section);
  if (!VALID.has(section)) redirect("/storefront/overview");

  const title = SECTION_TITLES[section] ?? section;

  const canEditSetup = userHasStorefrontPermission(u.permissions, STOREFRONT_PERMISSION.SETTINGS_MANAGE);

  let body: ReactNode = <StorefrontSectionContent section={section} />;
  if (section === "overview") {
    const loaded = await loadStorefrontSetupOverviewForMerchantUi(sp.websiteId);
    if (loaded.kind === "ready") {
      body = <StorefrontSetupOverview overview={loaded.overview} canEditManualSteps={canEditSetup} />;
    } else {
      body = <StorefrontSetupNoOrganization />;
    }
  }

  if (section === "onboarding") {
    const loaded = await loadStorefrontSetupOverviewForMerchantUi(sp.websiteId);
    if (loaded.kind === "ready") {
      body = <StorefrontOnboardingWizard overview={loaded.overview} canEditManualSteps={canEditSetup} />;
    } else {
      body = <StorefrontSetupNoOrganization />;
    }
  }

  return (
    <AuthenticatedLayout
      user={{ name: u.name, email: u.email, roles: u.roles, permissions: u.permissions, activatedPackages: u.activatedPackages }}
      breadcrumbs={[{ label: t("Storefronts"), url: "/storefront/overview" }, { label: title }]}
      pageTitle={title}
    >
      <StorefrontMerchantShell currentSection={section} permissions={u.permissions}>
        {body}
      </StorefrontMerchantShell>
    </AuthenticatedLayout>
  );
}
