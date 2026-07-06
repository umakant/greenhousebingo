import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import dynamic from "next/dynamic";
import { t } from "@/lib/admin-t";

const ResumeBuilderSystemSetup = dynamic(() => import("@/components/resume-builder/resume-builder-system-setup"));


const SECTION_LABELS: Record<string, string> = {
  "brand-settings": "Brand Settings",
  "hero-section": "Hero Section",
  "statistics-section": "Statistics Section",
  "faq-section": "FAQ Section",
  "tutorials-section": "Tutorials Section",
  "guides-section": "Guides Section",
  "support-section": "Support Section",
};

const SECTION_KEYS: Record<string, string> = {
  "brand-settings": "brand",
  "hero-section": "hero",
  "statistics-section": "statistics",
  "faq-section": "faq",
  "tutorials-section": "tutorials",
  "guides-section": "guides",
  "support-section": "support",
};

export default async function SystemSetupSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  const sectionLabel = SECTION_LABELS[section] ?? "Settings";
  const sectionKey = SECTION_KEYS[section];

  if (!sectionKey) redirect("/resume-builder/system-setup/brand-settings");

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("Resume Builder"), url: "/resume-builder" },
        { label: t("System Setup"), url: "/resume-builder/system-setup" },
        { label: t(sectionLabel) },
      ]}
      pageTitle={t("System Setup")}
    >
      <ResumeBuilderSystemSetup section={sectionKey as any} />
    </AuthenticatedLayout>
  );
}
