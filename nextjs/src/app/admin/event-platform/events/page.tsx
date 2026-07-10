import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const LmsEventsAdminClient = dynamic(() =>
  import("@/components/lms/lms-events-admin-client").then((m) => m.LmsEventsAdminClient),
);

export default async function EventPlatformEventsPage() {
  return (
    <EventPlatformPage
      permissions={["events.view", "manage-lms-events"]}
      path="/admin/event-platform/events"
      title="Bingo Events"
      hidePageTitle
    >
      <LmsEventsAdminClient />
    </EventPlatformPage>
  );
}
