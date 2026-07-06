import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { AppointmentSectionContent } from "@/components/appointment/appointment-section-content";
import { safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import { t } from "@/lib/admin-t";


const SECTION_TITLES: Record<string, string> = {
  appointments: t("Appointments"),
  questions: t("Questions"),
  schedules: t("Schedules"),
  callbacks: t("Appointment Callbacks"),
  setup: t("System Setup"),
};

export default async function AppointmentSectionPage({
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
        { label: t("Appointment Dashboard"), url: "/appointment" },
        { label: title },
      ]}
      pageTitle={title}
    >
      <AppointmentSectionContent section={section} permissions={permissions} />
    </AuthenticatedLayout>
  );
}
