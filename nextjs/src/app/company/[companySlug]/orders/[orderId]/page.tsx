import AuthenticatedLayout from "@/layouts/authenticated-layout";
import OrderDetail from "@/components/marketplace/company/storefront/order-detail";
import { requireCompanyMarketplaceAccess } from "@/lib/require-company-marketplace";
import { t } from "@/lib/admin-t";

export const dynamic = "force-dynamic";


export default async function CompanyOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string; orderId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { companySlug, orderId } = await params;
  const sp = await searchParams;
  const confirmation = sp.confirmation === "1" || sp.confirmation === "true";
  const { user, companySlug: slug } = await requireCompanyMarketplaceAccess(companySlug, "marketplace.orders.view");

  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[
        { label: t("Marketplace"), url: `/company/${slug}/marketplace` },
        { label: t("My Orders"), url: `/company/${slug}/orders` },
        { label: t("Order") },
      ]}
      pageTitle={t("Order")}
    >
      <OrderDetail companySlug={slug} orderId={orderId} confirmation={confirmation} />
    </AuthenticatedLayout>
  );
}
