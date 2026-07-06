import { Suspense } from "react";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { AffiliateLinksAdminClient } from "@/components/affiliate-business/affiliate-links-admin-client";
import { requireAffiliatePageAccess } from "@/lib/require-affiliate-page";
import { t } from "@/lib/admin-t";


export default async function AffiliateLinksPage() {
  const user = await requireAffiliatePageAccess("/affiliate-business/links", "manage-affiliate-links");

  return (
    <AuthenticatedLayout
      user={{
        name: user.name,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions,
        activatedPackages: user.activatedPackages,
        primaryRole: user.primaryRole,
      }}
      breadcrumbs={[
        { label: t("Affiliate Business"), url: "/affiliate-business" },
        { label: t("Links") },
      ]}
      pageTitle={t("Manage Affiliate Links")}
    >
      <Suspense fallback={<div className="p-12 text-center text-muted-foreground">{t("Loading...")}</div>}>
        <AffiliateLinksAdminClient />
      </Suspense>
    </AuthenticatedLayout>
  );
}
