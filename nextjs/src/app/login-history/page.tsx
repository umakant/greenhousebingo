import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import LoginHistoryAdmin from "@/components/login-history/login-history-admin";
import { decodePermissions } from '@/lib/read-user-cookies';
import { t } from "@/lib/admin-t";


/**
 * Staff sign-in audit log (`login_histories`). Optional `?user_id=` filters to one user (e.g. from Companies).
 */
export default async function LoginHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ user_id?: string }>;
}) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");
  if (role !== "superadmin") redirect("/dashboard");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = JSON.parse(store.get("pf_roles")?.value ?? "[]") as string[];
  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const activatedPackages = JSON.parse(store.get("pf_activated_packages")?.value ?? "[]") as string[];

  const sp = await searchParams;
  const userId = sp.user_id;

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("Companies"), url: "/companies" },
        { label: t("Login history") },
      ]}
      pageTitle={t("Login history")}
      pageActions={
        <Link
          href="/companies"
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm hover:bg-accent"
        >
          {t("Back")}
        </Link>
      }
    >
      <LoginHistoryAdmin initialUserId={userId} />
    </AuthenticatedLayout>
  );
}
