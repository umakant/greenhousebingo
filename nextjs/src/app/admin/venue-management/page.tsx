import dynamic from "next/dynamic";

import { VenueManagementPage } from "@/components/venue-management/venue-management-page";

const EventPlatformVenuesAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-venues-admin").then((m) => m.EventPlatformVenuesAdmin),
);

export default async function VenueManagementDashboardPage() {
  return (
    <VenueManagementPage
      permission="venues.view"
      path="/admin/venue-management"
      title="Venues"
      hidePageTitle
    >
      <EventPlatformVenuesAdmin />
    </VenueManagementPage>
  );
}
