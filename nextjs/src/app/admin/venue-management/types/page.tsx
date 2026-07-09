import { VenueLookupAdmin } from "@/components/venue-management/venue-lookup-admin";
import { VenueManagementPage } from "@/components/venue-management/venue-management-page";

export default async function VenueTypesPage() {
  return (
    <VenueManagementPage
      path="/admin/venue-management/types"
      permission="venues.manage"
      title="Venue Types"
      hidePageTitle
      breadcrumbs={[{ label: "Venue Types" }]}
    >
      <VenueLookupAdmin kind="type" />
    </VenueManagementPage>
  );
}
