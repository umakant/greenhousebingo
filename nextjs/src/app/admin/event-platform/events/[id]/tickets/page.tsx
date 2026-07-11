import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

const LmsEventAdminTicketsClient = dynamic(() =>
  import("@/components/lms/lms-event-admin-tickets-client").then((m) => m.LmsEventAdminTicketsClient),
);

type Props = { params: Promise<{ id: string }> };

export default async function EventPlatformEventTicketsPage({ params }: Props) {
  const { id } = await params;

  return (
    <EventPlatformPage
      permissions={["events.view", "manage-lms-events"]}
      path={`/admin/event-platform/events/${id}/tickets`}
      title="Event tickets"
      hidePageTitle
      breadcrumbs={[
        { label: "Events", url: EVENT_PLATFORM_PATHS.events },
        { label: "Tickets" },
      ]}
    >
      <LmsEventAdminTicketsClient eventId={id} />
    </EventPlatformPage>
  );
}
