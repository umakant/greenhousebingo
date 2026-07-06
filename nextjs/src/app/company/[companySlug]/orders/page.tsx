import AuthenticatedLayout from "@/layouts/authenticated-layout";
import OrdersList from "@/components/marketplace/company/storefront/orders-list";
import { requireCompanyMarketplaceAccess } from "@/lib/require-company-marketplace";
import { t } from "@/lib/admin-t";

export const dynamic = "force-dynamic";


export default async function CompanyOrdersPage({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  const { user, companySlug: slug } = await requireCompanyMarketplaceAccess(companySlug, "marketplace.orders.view");

  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace"), url: `/company/${slug}/marketplace` }, { label: t("My Orders") }]}
      pageTitle={t("My Orders")}
    >
      <OrdersList companySlug={slug} />
    </AuthenticatedLayout>
  );
}
