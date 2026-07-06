import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { decodePermissions } from '@/lib/read-user-cookies';

function titleCase(s: string) {
  return s
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default async function CatchAllAppPage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;

  if (!role) redirect("/login");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = JSON.parse(store.get("pf_roles")?.value ?? "[]") as string[];
  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const activatedPackages = JSON.parse(store.get("pf_activated_packages")?.value ?? "[]") as string[];

  const { path } = await params;
  const pageTitle = titleCase(path.at(-1) ?? "Page");
  const breadcrumbs = path.map((seg, idx) => ({
    label: titleCase(seg),
    url: "/" + path.slice(0, idx + 1).join("/"),
  }));

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      pageTitle={pageTitle}
      breadcrumbs={breadcrumbs}
    >
      <div className="rounded-xl border bg-background p-6">
        <div className="text-sm text-muted-foreground">Placeholder page</div>
        <div className="mt-2 font-medium">{pageTitle}</div>
        <div className="mt-4 text-sm">
          Route: <span className="font-mono">/{path.join("/")}</span>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

