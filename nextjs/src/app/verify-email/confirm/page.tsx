import Link from "next/link";

import { confirmEmailVerification } from "@/lib/send-email-verification";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cookies } from "next/headers";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailConfirmPage({ searchParams }: Props) {
  const sp = await searchParams;
  const token = (sp.token ?? "").trim();

  const store = await cookies();
  const email = store.get("pf_email")?.value?.trim() ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);
  const name = store.get("pf_name")?.value ?? "User";

  let success = false;
  let message = "Missing verification token.";
  if (token) {
    const result = await confirmEmailVerification(token);
    success = result.ok;
    message = result.ok ? "Your email has been verified." : result.message;
  }

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: "Launchpad", url: "/launchpad" }, { label: "Verify email" }]}
      pageTitle="Email verification"
    >
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>{success ? "Email verified" : "Verification failed"}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/launchpad">{success ? "Continue to Launchpad" : "Back to Launchpad"}</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthenticatedLayout>
  );
}
