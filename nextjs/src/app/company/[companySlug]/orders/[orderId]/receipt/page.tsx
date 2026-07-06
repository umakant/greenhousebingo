import AuthenticatedLayout from "@/layouts/authenticated-layout";
import OrderReceipt from "@/components/marketplace/company/storefront/order-receipt";
import { requireCompanyMarketplaceAccess } from "@/lib/require-company-marketplace";
import { t } from "@/lib/admin-t";

export const dynamic = "force-dynamic";


export default async function CompanyOrderReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ companySlug: string; orderId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { companySlug, orderId } = await params;
  const sp = await searchParams;
  const autoPrint = sp.print === "1" || sp.print === "true";
  const { user, companySlug: slug } = await requireCompanyMarketplaceAccess(companySlug, "marketplace.orders.view");

  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[
        { label: t("Marketplace"), url: `/company/${slug}/marketplace` },
        { label: t("My Orders"), url: `/company/${slug}/orders` },
        { label: t("Receipt") },
      ]}
      pageTitle={t("Receipt")}
    >
      <OrderReceipt companySlug={slug} orderId={orderId} autoPrint={autoPrint} />
    </AuthenticatedLayout>
  );
}
