import { VenueLookupAdmin } from "@/components/venue-management/venue-lookup-admin";
import { VenueManagementPage } from "@/components/venue-management/venue-management-page";

export default async function VenueCategoriesPage() {
  return (
    <VenueManagementPage
      path="/admin/venue-management/categories"
      permission="venues.manage"
      title="Venue Categories"
      hidePageTitle
      breadcrumbs={[{ label: "Venue Categories" }]}
    >
      <VenueLookupAdmin kind="category" />
    </VenueManagementPage>
  );
}
