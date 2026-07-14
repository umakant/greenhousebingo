import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformPlantInventoryAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-plant-inventory-admin").then(
    (m) => m.EventPlatformPlantInventoryAdmin,
  ),
);

export default async function EventPlatformPlantInventoryPage() {
  return (
    <EventPlatformPage
      permission="plantCatalog.view"
      path="/admin/event-platform/plant-inventory"
      title="Plant Inventory"
      hidePageTitle
    >
      <EventPlatformPlantInventoryAdmin />
    </EventPlatformPage>
  );
}
