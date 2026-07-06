import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformVendorDetailClient = dynamic(() =>
  import("@/components/event-platform/event-platform-vendor-detail-client").then((m) => m.EventPlatformVendorDetailClient),
);

type Props = { params: Promise<{ id: string }> };

export default async function EventPlatformVendorDetailPage(props: Props) {
  const { id } = await props.params;
  return (
    <EventPlatformPage
      permission="vendors.view"
      path={`/admin/event-platform/vendors/${id}`}
      title="Vendor"
      breadcrumbs={[{ label: "Vendors", url: "/admin/event-platform/vendors" }, { label: "Detail" }]}
    >
      <EventPlatformVendorDetailClient vendorId={id} />
    </EventPlatformPage>
  );
}
