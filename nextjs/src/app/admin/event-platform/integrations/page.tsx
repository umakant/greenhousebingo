import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformIntegrationsAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-integrations-admin").then((m) => m.EventPlatformIntegrationsAdmin),
);

export default async function EventPlatformIntegrationsPage() {
  return (
    <EventPlatformPage permission="integrations.manage" path="/admin/event-platform/integrations" title="Integrations">
      <EventPlatformIntegrationsAdmin />
    </EventPlatformPage>
  );
}
