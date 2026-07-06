import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformWorkshopsAdminClient = dynamic(() =>
  import("@/components/event-platform/event-platform-workshops-admin-client").then(
    (m) => m.EventPlatformWorkshopsAdminClient,
  ),
);

export default async function EventPlatformWorkshopsPage() {
  return (
    <EventPlatformPage
      permissions={["events.view", "manage-lms-events"]}
      path="/admin/event-platform/workshops"
      title="Workshops"
      hidePageTitle
    >
      <EventPlatformWorkshopsAdminClient />
    </EventPlatformPage>
  );
}
