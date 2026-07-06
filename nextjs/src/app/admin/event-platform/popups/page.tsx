import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformPopupsAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-popups-admin").then((m) => m.EventPlatformPopupsAdmin),
);

export default async function EventPlatformPopupsPage() {
  return (
    <EventPlatformPage permission="cms.manage" path="/admin/event-platform/popups" title="Popups">
      <EventPlatformPopupsAdmin />
    </EventPlatformPage>
  );
}
