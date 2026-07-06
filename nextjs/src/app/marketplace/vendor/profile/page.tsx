import AuthenticatedLayout from "@/layouts/authenticated-layout";
import VendorProfile from "@/components/marketplace/vendor/vendor-profile";
import { requireMarketplaceVendorPage } from "@/lib/require-marketplace-vendor-page";
import { t } from "@/lib/admin-t";


export default async function MarketplaceVendorProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const user = await requireMarketplaceVendorPage("marketplace.vendor_portal.profile.manage");
  const params = await searchParams;

  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Vendor Portal"), url: "/marketplace/vendor" }, { label: t("Settings") }]}
      pageTitle={t("Settings")}
    >
      <VendorProfile forceReset={user.forcePasswordReset || params.reset === "1"} />
    </AuthenticatedLayout>
  );
}
