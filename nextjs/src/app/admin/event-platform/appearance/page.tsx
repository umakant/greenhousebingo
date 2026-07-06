import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformAppearanceAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-appearance-admin").then((m) => m.EventPlatformAppearanceAdmin),
);

export default async function EventPlatformAppearancePage() {
  return (
    <EventPlatformPage permission="settings.manage" path="/admin/event-platform/appearance" title="Appearance">
      <EventPlatformAppearanceAdmin />
    </EventPlatformPage>
  );
}
