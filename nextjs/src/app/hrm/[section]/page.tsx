import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { HrmSectionContent } from "@/components/hrm/hrm-section-content";
import { safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import { t } from "@/lib/admin-t";


const SECTION_TITLES: Record<string, string> = {
  employees: t("Employees"),
  "set-salary": t("Set Salary"),
  payrolls: t("Payroll"),
  shifts: t("Shifts"),
  attendances: t("Attendances"),
  "leave-types": t("Leave Types"),
  "leave-applications": t("Leave Applications"),
  "leave-balance": t("Leave Balance"),
  holidays: t("Holidays"),
  awards: t("Awards"),
  promotions: t("Promotions"),
  resignations: t("Resignations"),
  terminations: t("Terminations"),
  warnings: t("Warnings"),
  complaints: t("Complaints"),
  transfers: t("Transfers"),
  documents: t("Documents"),
  acknowledgments: t("Acknowledgments"),
  announcements: t("Announcements"),
  events: t("Events"),
  branches: t("Branches"),
  departments: t("Departments"),
  designations: t("Designations"),
  setup: t("System Setup"),
};

export default async function HrmSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const { section } = await params;
  const title =
    SECTION_TITLES[section] ??
    section.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("HRM Dashboard"), url: "/hrm" },
        { label: title },
      ]}
      pageTitle={title}
    >
      <HrmSectionContent section={section} permissions={permissions} />
    </AuthenticatedLayout>
  );
}
