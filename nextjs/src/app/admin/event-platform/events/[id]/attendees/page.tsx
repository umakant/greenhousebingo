import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

const LmsEventAdminAttendeesClient = dynamic(() =>
  import("@/components/lms/lms-event-admin-attendees-client").then((m) => m.LmsEventAdminAttendeesClient),
);

type Props = { params: Promise<{ id: string }> };

export default async function EventPlatformEventAttendeesPage({ params }: Props) {
  const { id } = await params;

  return (
    <EventPlatformPage
      permissions={["events.view", "manage-lms-events"]}
      path={`/admin/event-platform/events/${id}/attendees`}
      title="Event attendees"
      breadcrumbs={[
        { label: "Events", url: EVENT_PLATFORM_PATHS.events },
        { label: "Attendees" },
      ]}
    >
      <LmsEventAdminAttendeesClient eventId={id} />
    </EventPlatformPage>
  );
}
