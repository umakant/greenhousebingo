import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

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
        { label: "Email", url: "/admin/event-platform/email" },
        { label: "Templates" },
      ]}
    >
      <EventPlatformEmailTemplatesAdmin />
    </EventPlatformPage>
  );
}
