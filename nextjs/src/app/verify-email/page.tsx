import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { VerifyEmailClient } from "@/components/launchpad/verify-email-client";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { safeJsonParse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { decodePermissions } from "@/lib/read-user-cookies";

export default async function VerifyEmailPage() {
  const store = await cookies();
  const email = store.get("pf_email")?.value?.trim() ?? "";
  if (!email) redirect("/login");

  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);
  const name = store.get("pf_name")?.value ?? "User";

  const userRow = await prisma.user.findFirst({
    where: { email: email.toLowerCase() },
    select: { emailVerifiedAt: true },
  });

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: "Launchpad", url: "/launchpad" }, { label: "Verify email" }]}
      pageTitle="Verify email"
    >
      <VerifyEmailClient email={email} verified={Boolean(userRow?.emailVerifiedAt)} />
    </AuthenticatedLayout>
  );
}
