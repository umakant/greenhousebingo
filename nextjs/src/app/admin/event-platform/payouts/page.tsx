import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformPayoutsAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-payouts-admin").then((m) => m.EventPlatformPayoutsAdmin),
);

export default async function EventPlatformPayoutsPage() {
  return (
    <EventPlatformPage permission="payouts.manage" path="/admin/event-platform/payouts" title="Payouts">
      <EventPlatformPayoutsAdmin />
    </EventPlatformPage>
  );
}
