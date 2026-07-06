import { notFound } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import VendorProductsAdmin from "@/components/marketplace/admin/vendor-products-admin";
import { requireMarketplaceAdminPage } from "@/lib/require-marketplace-admin-page";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/admin-t";


export default async function AdminMarketplaceVendorProductsPage({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}) {
  const user = await requireMarketplaceAdminPage("marketplace.vendor.view");
  const { vendorId } = await params;

  let id: bigint;
  try {
    id = BigInt(vendorId);
  } catch {
    notFound();
  }

  const vendor = await prisma.marketplaceVendor.findFirst({
    where: { id },
    select: { id: true, name: true },
  });
  if (!vendor) notFound();

  const perms = user.permissions;
  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[
        { label: t("Marketplace"), url: "/admin/marketplace" },
        { label: t("Vendors"), url: "/admin/marketplace/vendors" },
        { label: vendor.name },
      ]}
      pageTitle={`${vendor.name} — ${t("Products")}`}
    >
      <VendorProductsAdmin
        vendorId={vendor.id.toString()}
        vendorName={vendor.name}
        canManage={perms.includes("*") || perms.includes("marketplace.vendor.manage") || perms.includes("marketplace.manage")}
      />
    </AuthenticatedLayout>
  );
}
