import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformVendorsAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-vendors-admin").then((m) => m.EventPlatformVendorsAdmin),
);

export default async function EventPlatformVendorsPage() {
  return (
    <EventPlatformPage permission="vendors.view" path="/admin/event-platform/vendors" title="Vendors" hidePageTitle>
      <EventPlatformVendorsAdmin />
    </EventPlatformPage>
  );
}
