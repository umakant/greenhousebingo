import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

const EventCommandCenter = dynamic(() =>
  import("@/components/event-platform/event-command-center").then((m) => m.EventCommandCenter),
);

type Props = { params: Promise<{ id: string }> };

export default async function EventPlatformEventDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <EventPlatformPage
      permissions={["events.view", "manage-lms-events"]}
      path={`/admin/event-platform/events/${id}`}
      title="Event command center"
      breadcrumbs={[
        { label: "Events", url: EVENT_PLATFORM_PATHS.events },
        { label: "Command center" },
      ]}
    >
      <EventCommandCenter eventId={id} />
    </EventPlatformPage>
  );
}
