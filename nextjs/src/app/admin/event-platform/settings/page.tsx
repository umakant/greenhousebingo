import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformSettingsAdminClient = dynamic(() =>
  import("@/components/event-platform/event-platform-settings-admin-client").then(
    (m) => m.EventPlatformSettingsAdminClient,
  ),
);

export default async function EventPlatformSettingsPage() {
  return (
    <EventPlatformPage permission="settings.manage" path="/admin/event-platform/settings" title="Settings">
      <EventPlatformSettingsAdminClient />
    </EventPlatformPage>
  );
}
