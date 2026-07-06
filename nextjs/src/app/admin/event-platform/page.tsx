import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformOverview = dynamic(() =>
  import("@/components/event-platform/event-platform-overview").then((m) => m.EventPlatformOverview),
);

export default async function EventPlatformDashboardPage() {
  return (
    <EventPlatformPage
      permission="reports.view"
      path="/admin/event-platform"
      title="Overview"
      hidePageTitle
    >
      <EventPlatformOverview />
    </EventPlatformPage>
  );
}
