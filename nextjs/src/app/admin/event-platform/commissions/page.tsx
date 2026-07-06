import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformCommissionsAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-commissions-admin").then((m) => m.EventPlatformCommissionsAdmin),
);

export default async function EventPlatformCommissionsPage() {
  return (
    <EventPlatformPage permission="commissions.manage" path="/admin/event-platform/commissions" title="Commission">
      <EventPlatformCommissionsAdmin />
    </EventPlatformPage>
  );
}
