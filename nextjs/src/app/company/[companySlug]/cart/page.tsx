import AuthenticatedLayout from "@/layouts/authenticated-layout";
import CartView from "@/components/marketplace/company/storefront/cart-view";
import { getMarketplacePricingConfig } from "@/lib/marketplace-pricing";
import { requireCompanyMarketplaceAccess } from "@/lib/require-company-marketplace";
import { t } from "@/lib/admin-t";

export const dynamic = "force-dynamic";


export default async function CompanyCartPage({ params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  const { user, companySlug: slug } = await requireCompanyMarketplaceAccess(companySlug, "marketplace.view");
  const cfg = await getMarketplacePricingConfig();

  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Marketplace"), url: `/company/${slug}/marketplace` }, { label: t("Cart") }]}
      pageTitle={t("Cart")}
    >
      <CartView companySlug={slug} pricing={cfg} />
    </AuthenticatedLayout>
  );
}
