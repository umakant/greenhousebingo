import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import AssetsAssignments from "@/components/assets/assets-assignments";
import AssetsLocations from "@/components/assets/assets-locations";
import AssetsMaintenance from "@/components/assets/assets-maintenance";
import AssetsDepreciation from "@/components/assets/assets-depreciation";
import AssetsCategories from "@/components/assets/assets-categories";
import AssetsBorrowRent from "@/components/assets/assets-borrow-rent";
import AssetsBorrowPayments from "@/components/assets/assets-borrow-payments";
import AssetsBorrowReport from "@/components/assets/assets-borrow-report";
import { t } from "@/lib/admin-t";


const SECTION_TITLES: Record<string, string> = {
  assignments: t("Assignments"),
  locations: t("Locations"),
  maintenance: t("Maintenance"),
  depreciation: t("Depreciation"),
  categories: t("Categories"),
  "borrow-rent": t("Borrow & Rent"),
  "borrow-payments": t("Payments"),
  "borrow-report": t("Borrow & Rent Report"),
};

export default async function AssetsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const { section } = await params;
  const sectionTitle = SECTION_TITLES[section] ?? section;

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  function renderSection() {
    switch (section) {
      case "assignments": return <AssetsAssignments permissions={permissions} />;
      case "locations": return <AssetsLocations permissions={permissions} />;
      case "maintenance": return <AssetsMaintenance permissions={permissions} />;
      case "depreciation": return <AssetsDepreciation permissions={permissions} />;
      case "categories": return <AssetsCategories permissions={permissions} />;
      case "borrow-rent": return <AssetsBorrowRent permissions={permissions} />;
      case "borrow-payments": return <AssetsBorrowPayments permissions={permissions} />;
      case "borrow-report": return <AssetsBorrowReport permissions={permissions} />;
      default: redirect("/assets");
    }
  }

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("Assets"), url: "/assets" },
        { label: sectionTitle },
      ]}
      pageTitle={sectionTitle}
    >
      {renderSection()}
    </AuthenticatedLayout>
  );
}
