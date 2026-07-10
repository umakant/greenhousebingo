import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformHostsAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-hosts-admin").then((m) => m.EventPlatformHostsAdmin),
);

export default async function EventPlatformHostsPage() {
  return (
    <EventPlatformPage permission="hosts.view" path="/admin/event-platform/hosts" title="Hosts" hidePageTitle>
      <EventPlatformHostsAdmin />
    </EventPlatformPage>
  );
}
