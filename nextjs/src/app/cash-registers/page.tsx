import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import PosCashRegistersClient from "./client";

export default async function PosCashRegistersPage() {
  const store = await cookies();
  if (!store.get("pf_role")?.value) redirect("/login");
  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);
  return (
    <AuthenticatedLayout user={{ name, email, roles, permissions, activatedPackages }} pageTitle="Cash Registers" breadcrumbs={[{ label: "POS Dashboard", url: "/pos/dashboard" }, { label: "Cash Registers" }]}>
      <PosCashRegistersClient />
    </AuthenticatedLayout>
  );
}
