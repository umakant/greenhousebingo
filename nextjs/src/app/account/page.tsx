import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { AccountDashboard } from "@/components/account-dashboard";
import { decodePermissions } from '@/lib/read-user-cookies';
import { t } from "@/lib/admin-t";

function parseJsonCookie(value: string | undefined, fallback: string): unknown {
  const raw = value ?? fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(fallback);
  }
}


export default async function AccountPage() {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = parseJsonCookie(store.get("pf_roles")?.value, "[]") as string[];
  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const activatedPackages = parseJsonCookie(store.get("pf_activated_packages")?.value, "[]") as string[];

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: t("Account Dashboard") }]}
      pageTitle={t("Account Dashboard")}
    >
      <AccountDashboard />
    </AuthenticatedLayout>
  );
}
