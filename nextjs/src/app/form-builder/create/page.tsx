import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import dynamic from "next/dynamic";
import { getOnboardingPacketTemplate } from "@/components/form-builder/onboarding-packet-template";
import { t } from "@/lib/admin-t";

const FormBuilderCreateContent = dynamic(() => import("@/components/form-builder/form-builder-create"));


export default async function FormBuilderCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  const sp = await searchParams;
  const onboarding = sp.template === "onboarding";
  const onboardingTmpl = onboarding ? getOnboardingPacketTemplate() : null;

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: t("Form Builder"), url: "/form-builder" }, { label: t("Create Form") }]}
      pageTitle={t("Create Form")}
    >
      <FormBuilderCreateContent
        initialName={onboardingTmpl?.name}
        initialLayout={onboardingTmpl?.default_layout}
        initialFields={onboardingTmpl?.fields}
      />
    </AuthenticatedLayout>
  );
}
