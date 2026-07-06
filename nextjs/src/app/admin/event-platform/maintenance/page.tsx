import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformMaintenanceAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-maintenance-admin").then((m) => m.EventPlatformMaintenanceAdmin),
);

export default async function EventPlatformMaintenancePage() {
  return (
    <EventPlatformPage permission="settings.manage" path="/admin/event-platform/maintenance" title="Maintenance Mode">
      <EventPlatformMaintenanceAdmin />
    </EventPlatformPage>
  );
}
