import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformLanguagesAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-languages-admin").then((m) => m.EventPlatformLanguagesAdmin),
);

export default async function EventPlatformLanguagesPage() {
  return (
    <EventPlatformPage permission="settings.manage" path="/admin/event-platform/languages" title="Languages">
      <EventPlatformLanguagesAdmin />
    </EventPlatformPage>
  );
}
