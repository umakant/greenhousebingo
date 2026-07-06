import { notFound } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { ComplianceSectionView } from "@/components/compliance/compliance-section-view";
import { COMPLIANCE_SECTIONS } from "@/lib/compliance/compliance-sections";
import { requireCompliancePageAccess } from "@/lib/require-compliance-page";
import { t } from "@/lib/admin-t";

export default async function ComplianceSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const config = COMPLIANCE_SECTIONS[section];
  if (!config) notFound();

  const user = await requireCompliancePageAccess(`/compliance/${section}`);

  return (
    <AuthenticatedLayout
      user={{
        name: user.name,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions,
        activatedPackages: user.activatedPackages,
        primaryRole: user.primaryRole,
      }}
      breadcrumbs={[
        { label: t("Compliance"), url: "/compliance" },
        { label: t(config.title) },
      ]}
    >
      <ComplianceSectionView
        section={section}
        title={t(config.title)}
        description={t(config.description)}
      />
    </AuthenticatedLayout>
  );
}
