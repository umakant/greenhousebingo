import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformTranslationsAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-translations-admin").then(
    (m) => m.EventPlatformTranslationsAdmin,
  ),
);

export default async function EventPlatformTranslationsPage() {
  return (
    <EventPlatformPage permission="settings.manage" path="/admin/event-platform/translations" title="Translations">
      <EventPlatformTranslationsAdmin />
    </EventPlatformPage>
  );
}
