import type { ReactNode } from "react";

export default function SuperadminLayout({ children }: { children: ReactNode }) {
  // All superadmin pages should use the shared `AuthenticatedLayout` wrapper
  // (same shell as Laravel). Each page provides its own `pageTitle`/breadcrumbs.
  return children;
}
