import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import MarketplaceSettingsForm from "@/components/cms/marketplace-settings-form";
import { decodePermissions } from '@/lib/read-user-cookies';
import { t } from "@/lib/admin-t";


type Props = { searchParams?: Promise<{ module?: string }> | { module?: string } };

export default async function MarketplaceSettingsPage(props: Props) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");
  if (role !== "superadmin") redirect("/dashboard");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = JSON.parse(store.get("pf_roles")?.value ?? "[]") as string[];
  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const activatedPackages = JSON.parse(store.get("pf_activated_packages")?.value ?? "[]") as string[];

  const searchParams = await (Promise.resolve(props.searchParams).then((p) => p ?? {}));
  const initialModule = typeof searchParams?.module === "string" ? searchParams.module : undefined;

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: t("Marketplace Settings") }]}
      pageTitle={t("Marketplace Settings")}
    >
      <Suspense fallback={<div className="text-sm text-muted-foreground">{t("Loading...")}</div>}>
        <MarketplaceSettingsForm initialModule={initialModule} />
      </Suspense>
    </AuthenticatedLayout>
  );
}

