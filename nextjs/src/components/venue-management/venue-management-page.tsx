import type { ReactNode } from "react";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { t } from "@/lib/admin-t";
import {
  requireVenueManagementPageAccess,
  requireVenueManagementPageAccessAny,
} from "@/lib/venue-management/require-venue-management-page";

type Breadcrumb = { label: string; url?: string };

type VenueManagementPageProps = {
  permission?: string;
  permissions?: string[];
  path: string;
  title: string;
  breadcrumbs?: Breadcrumb[];
  hidePageTitle?: boolean;
  children: ReactNode;
};

export async function VenueManagementPage(props: VenueManagementPageProps) {
  const required = props.permissions ?? (props.permission ? [props.permission] : []);
  const user =
    required.length > 1
      ? await requireVenueManagementPageAccessAny(props.path, required)
      : await requireVenueManagementPageAccess(props.path, required[0] ?? "manage-venue-management");
  const crumbs: Breadcrumb[] = [
    { label: t("Venue Management"), url: "/admin/venue-management" },
    ...(props.breadcrumbs ?? [{ label: t(props.title) }]),
  ];
  return (
    <AuthenticatedLayout
      user={user}
      pageTitle={props.hidePageTitle ? undefined : t(props.title)}
      breadcrumbs={crumbs}
    >
      {props.children}
    </AuthenticatedLayout>
  );
}
