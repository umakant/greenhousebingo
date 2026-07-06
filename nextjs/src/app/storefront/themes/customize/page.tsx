import Link from "next/link";

import { StorefrontMerchantShell } from "@/components/storefront/storefront-merchant-shell";
import { StorefrontThemeCustomizer } from "@/components/storefront/storefront-theme-customizer";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { requireStorefrontPageAccess } from "@/lib/require-storefront-page";
import { STOREFRONT_PERMISSION, userHasStorefrontPermission } from "@/lib/storefront-permissions";
import { t } from "@/lib/admin-t";


export default async function StorefrontThemeCustomizePage({
  searchParams,
}: {
  searchParams: Promise<{ themeId?: string; websiteId?: string; organizationId?: string }>;
}) {
  const sp = await searchParams;
  const u = await requireStorefrontPageAccess("/storefront/themes/customize", "themes");

  if (!userHasStorefrontPermission(u.permissions, STOREFRONT_PERMISSION.THEME_MANAGE)) {
    return (
      <AuthenticatedLayout
        user={{ name: u.name, email: u.email, roles: u.roles, permissions: u.permissions, activatedPackages: u.activatedPackages }}
        breadcrumbs={[
          { label: t("Storefronts"), url: "/storefront/overview" },
          { label: t("Themes"), url: "/storefront/themes" },
          { label: t("Customize") },
        ]}
        pageTitle={t("Customize theme")}
      >
        <StorefrontMerchantShell currentSection="themes" permissions={u.permissions}>
          <p className="text-sm text-muted-foreground">
            {t("You need permission to manage themes to use the theme editor.")}{" "}
            <Link href="/storefront/themes" className="text-primary underline">
              {t("Back to Themes")}
            </Link>
          </p>
        </StorefrontMerchantShell>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout
      user={{ name: u.name, email: u.email, roles: u.roles, permissions: u.permissions, activatedPackages: u.activatedPackages }}
      breadcrumbs={[
        { label: t("Storefronts"), url: "/storefront/overview" },
        { label: t("Themes"), url: "/storefront/themes" },
        { label: t("Customize") },
      ]}
      pageTitle={t("Customize theme")}
    >
      <StorefrontMerchantShell currentSection="themes" permissions={u.permissions}>
        <StorefrontThemeCustomizer
          initialThemeId={sp.themeId}
          initialWebsiteId={sp.websiteId}
          initialOrganizationId={sp.organizationId}
        />
      </StorefrontMerchantShell>
    </AuthenticatedLayout>
  );
}
