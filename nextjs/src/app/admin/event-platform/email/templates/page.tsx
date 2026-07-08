import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

const EventPlatformEmailTemplatesAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-email-templates-admin").then(
    (m) => m.EventPlatformEmailTemplatesAdmin,
  ),
);

export default async function EventPlatformEmailTemplatesPage() {
  return (
    <EventPlatformPage
      permission="settings.manage"
      path="/admin/event-platform/email/templates"
      title="Email Templates"
      breadcrumbs={[
        { label: "Event Platform", url: "/admin/event-platform" },
        { label: "Settings", url: EVENT_PLATFORM_PATHS.settings },
        { label: "Templates" },
      ]}
    >
      <EventPlatformEmailTemplatesAdmin />
    </EventPlatformPage>
  );
}
