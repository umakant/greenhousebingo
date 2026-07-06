import AuthenticatedLayout from "@/layouts/authenticated-layout";
import MarketplaceVendors from "@/components/marketplace/company/storefront/marketplace-vendors";
import { requireCompanyMarketplaceAccess } from "@/lib/require-company-marketplace";
import { t } from "@/lib/admin-t";

export const dynamic = "force-dynamic";


export default async function CompanyMarketplacePage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const { user, companySlug: slug } = await requireCompanyMarketplaceAccess(companySlug, "marketplace.view");

  return (
    <AuthenticatedLayout user={user} breadcrumbs={[{ label: t("Marketplace") }]} pageTitle={t("Marketplace")}>
      <MarketplaceVendors companySlug={slug} />
    </AuthenticatedLayout>
  );
}
