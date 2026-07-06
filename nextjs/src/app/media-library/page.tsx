import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import MediaLibraryPage from "@/components/media/media-library-page";
import { decodePermissions } from '@/lib/read-user-cookies';
import { t } from "@/lib/admin-t";


export default async function MediaLibraryRoute() {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = JSON.parse(store.get("pf_roles")?.value ?? "[]") as string[];
  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const activatedPackages = JSON.parse(store.get("pf_activated_packages")?.value ?? "[]") as string[];

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: t("Media Library") }]}
      pageTitle={t("Manage Media Library")}
    >
      <MediaLibraryPage />
    </AuthenticatedLayout>
  );
}

