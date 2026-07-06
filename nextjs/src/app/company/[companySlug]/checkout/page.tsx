import AuthenticatedLayout from "@/layouts/authenticated-layout";
import CheckoutView from "@/components/marketplace/company/storefront/checkout-view";
import { getMarketplacePricingConfig } from "@/lib/marketplace-pricing";
import { requireCompanyMarketplaceAccess } from "@/lib/require-company-marketplace";
import { t } from "@/lib/admin-t";

export const dynamic = "force-dynamic";


export default async function CompanyCheckoutPage({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  const { user, companySlug: slug } = await requireCompanyMarketplaceAccess(companySlug, "marketplace.orders.manage");
  const cfg = await getMarketplacePricingConfig();

  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[
        { label: t("Marketplace"), url: `/company/${slug}/marketplace` },
        { label: t("Cart"), url: `/company/${slug}/cart` },
        { label: t("Checkout") },
      ]}
      pageTitle={t("Checkout")}
    >
      <CheckoutView companySlug={slug} pricing={cfg} userEmail={user.email} />
    </AuthenticatedLayout>
  );
}
