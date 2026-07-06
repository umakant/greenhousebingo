import AuthenticatedLayout from "@/layouts/authenticated-layout";
import VendorCatalog from "@/components/marketplace/company/storefront/vendor-catalog";
import { requireCompanyMarketplaceAccess } from "@/lib/require-company-marketplace";
import { t } from "@/lib/admin-t";

export const dynamic = "force-dynamic";


export default async function CompanyVendorPage({
  params,
}: {
  params: Promise<{ companySlug: string; vendorSlug: string }>;
}) {
  const { companySlug, vendorSlug } = await params;
  const { user, companySlug: slug } = await requireCompanyMarketplaceAccess(companySlug, "marketplace.view");

  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace"), url: `/company/${slug}/marketplace` }, { label: t("Vendor") }]}
      pageTitle={t("Marketplace")}
    >
      <VendorCatalog companySlug={slug} vendorSlug={vendorSlug} />
    </AuthenticatedLayout>
  );
}
