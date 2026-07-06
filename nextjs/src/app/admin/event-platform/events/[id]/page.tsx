import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

const LmsEventAdminDetailClient = dynamic(() =>
  import("@/components/lms/lms-event-admin-detail-client").then((m) => m.LmsEventAdminDetailClient),
);

type Props = { params: Promise<{ id: string }> };

export default async function EventPlatformEventDetailPage({ params }: Props) {
  const { id } = await params;

  return (
    <EventPlatformPage
      permissions={["events.view", "manage-lms-events"]}
      path={`/admin/event-platform/events/${id}`}
      title="Event overview"
      breadcrumbs={[
        { label: "Events", url: EVENT_PLATFORM_PATHS.events },
        { label: "Overview" },
      ]}
    >
      <LmsEventAdminDetailClient eventId={id} />
    </EventPlatformPage>
  );
}
