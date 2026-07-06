import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformPaymentsOfflineAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-payments-offline-admin").then((m) => m.EventPlatformPaymentsOfflineAdmin),
);

export default async function EventPlatformPaymentsOfflinePage() {
  return (
    <EventPlatformPage
      permission="payments.manage"
      path="/admin/event-platform/payments/offline"
      title="Offline Methods"
      breadcrumbs={[{ label: "Payment Gateways", url: "/admin/event-platform/payments" }, { label: "Offline" }]}
    >
      <EventPlatformPaymentsOfflineAdmin />
    </EventPlatformPage>
  );
}
