import type { ReactNode } from "react";

import { EventPlatformMaintenanceBlock } from "@/components/event-platform/event-platform-maintenance-block";
import { LmsAuthenticatedShell } from "@/components/lms/lms-authenticated-shell";
import { LmsLearnerContent } from "@/components/lms/lms-learner-experience";
import { isEventPlatformMaintenanceBlocked } from "@/lib/event-platform/maintenance-gate";
import { resolveEventPlatformTenantFromCookies } from "@/lib/event-platform/tenant-context";
import { requireLmsEmployeeLearnerPage } from "@/lib/require-lms-page";

type Crumb = { label: string; url?: string };

export async function LmsLearnerPageShell(props: {
  auditPath: string;
  pageTitle: string;
  breadcrumbs: Crumb[];
  children: ReactNode;
}) {
  const user = await requireLmsEmployeeLearnerPage(props.auditPath);

  const tenant = await resolveEventPlatformTenantFromCookies();
  if (tenant) {
    const maintenance = await isEventPlatformMaintenanceBlocked(tenant.organizationId, props.auditPath);
    if (maintenance.blocked && maintenance.settings) {
      return (
        <LmsAuthenticatedShell
          user={user}
          pageTitle={props.pageTitle}
          breadcrumbs={props.breadcrumbs}
        >
          <EventPlatformMaintenanceBlock settings={maintenance.settings} />
        </LmsAuthenticatedShell>
      );
    }
  }

  return (
    <LmsAuthenticatedShell
      user={user}
      pageTitle={props.pageTitle}
      breadcrumbs={props.breadcrumbs}
    >
      <LmsLearnerContent>{props.children}</LmsLearnerContent>
    </LmsAuthenticatedShell>
  );
}
