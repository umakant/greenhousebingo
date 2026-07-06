import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformPagesAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-pages-admin").then((m) => m.EventPlatformPagesAdmin),
);

export default async function EventPlatformPagesListPage() {
  return (
    <EventPlatformPage permission="cms.manage" path="/admin/event-platform/pages" title="Pages">
      <EventPlatformPagesAdmin />
    </EventPlatformPage>
  );
}
