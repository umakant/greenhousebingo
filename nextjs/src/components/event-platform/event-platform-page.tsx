import type { ReactNode } from "react";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { requireEventPlatformPageAccess, requireEventPlatformPageAccessAny } from "@/lib/event-platform/require-event-platform-page";
import { t } from "@/lib/admin-t";

type Breadcrumb = { label: string; url?: string };

type EventPlatformPageProps = {
  permission?: string;
  permissions?: string[];
  path: string;
  title: string;
  breadcrumbs?: Breadcrumb[];
  hidePageTitle?: boolean;
  children: ReactNode;
};

export async function EventPlatformPage(props: EventPlatformPageProps) {
  const required = props.permissions ?? (props.permission ? [props.permission] : []);
  const user =
    required.length > 1
      ? await requireEventPlatformPageAccessAny(props.path, required)
      : await requireEventPlatformPageAccess(props.path, required[0] ?? "manage-event-platform");
  const crumbs: Breadcrumb[] = [
    { label: t("Event Platform"), url: "/admin/event-platform" },
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
