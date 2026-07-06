import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformPaymentsOnlineAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-payments-online-admin").then((m) => m.EventPlatformPaymentsOnlineAdmin),
);

export default async function EventPlatformPaymentsOnlinePage() {
  return (
    <EventPlatformPage
      permission="payments.manage"
      path="/admin/event-platform/payments/online"
      title="Online Gateways"
      breadcrumbs={[{ label: "Payment Gateways", url: "/admin/event-platform/payments" }, { label: "Online" }]}
    >
      <EventPlatformPaymentsOnlineAdmin />
    </EventPlatformPage>
  );
}
