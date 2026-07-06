import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformSeatmapsAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-seatmaps-admin").then((m) => m.EventPlatformSeatmapsAdmin),
);

export default async function EventPlatformSeatmapsPage() {
  return (
    <EventPlatformPage permission="cms.manage" path="/admin/event-platform/seatmaps" title="Seat Maps">
      <EventPlatformSeatmapsAdmin />
    </EventPlatformPage>
  );
}
