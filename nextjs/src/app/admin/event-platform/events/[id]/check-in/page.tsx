import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

const LmsEventAdminCheckInClient = dynamic(() =>
  import("@/components/lms/lms-event-admin-attendees-client").then((m) => m.LmsEventAdminCheckInClient),
);

type Props = { params: Promise<{ id: string }> };

export default async function EventPlatformEventCheckInPage({ params }: Props) {
  const { id } = await params;

  return (
    <EventPlatformPage
      permissions={["bookings.manage", "manage-lms-events", "manage-lms-event-checkin"]}
      path={`/admin/event-platform/events/${id}/check-in`}
      title="Event check-in"
      hidePageTitle
      breadcrumbs={[
        { label: "Events", url: EVENT_PLATFORM_PATHS.events },
        { label: "Check-in" },
      ]}
    >
      <LmsEventAdminCheckInClient eventId={id} />
    </EventPlatformPage>
  );
}
