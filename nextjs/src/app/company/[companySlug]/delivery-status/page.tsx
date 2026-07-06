import AuthenticatedLayout from "@/layouts/authenticated-layout";
import DeliveryStatus from "@/components/marketplace/company/storefront/delivery-status";
import { requireCompanyMarketplaceAccess } from "@/lib/require-company-marketplace";
import { t } from "@/lib/admin-t";

export const dynamic = "force-dynamic";


export default async function CompanyDeliveryStatusPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const { user, companySlug: slug } = await requireCompanyMarketplaceAccess(companySlug, "marketplace.view");

  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace"), url: `/company/${slug}/marketplace` }, { label: t("Delivery Status") }]}
      pageTitle={t("Delivery Status")}
    >
      <DeliveryStatus companySlug={slug} />
    </AuthenticatedLayout>
  );
}
