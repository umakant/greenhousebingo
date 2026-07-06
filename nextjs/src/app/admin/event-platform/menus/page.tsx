import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformMenusAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-menus-admin").then((m) => m.EventPlatformMenusAdmin),
);

export default async function EventPlatformMenusPage() {
  return (
    <EventPlatformPage permission="menus.manage" path="/admin/event-platform/menus" title="Menu Builder">
      <EventPlatformMenusAdmin />
    </EventPlatformPage>
  );
}
