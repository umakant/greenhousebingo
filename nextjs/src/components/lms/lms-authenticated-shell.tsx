import type { ReactNode } from "react";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import type { LmsPageUser } from "@/lib/require-lms-page";

type Crumb = { label: string; url?: string };

export function LmsAuthenticatedShell(props: {
  user: LmsPageUser;
  pageTitle: string;
  breadcrumbs: Crumb[];
  children: ReactNode;
}) {
  const { user, pageTitle, breadcrumbs, children } = props;
  return (
    <AuthenticatedLayout
      user={{
        name: user.name,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions,
        activatedPackages: user.activatedPackages,
        primaryRole: user.primaryRole,
      }}
      breadcrumbs={breadcrumbs}
      pageTitle={pageTitle}
    >
      {children}
    </AuthenticatedLayout>
  );
}
