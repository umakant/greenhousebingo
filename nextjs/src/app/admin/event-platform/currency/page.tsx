import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformCurrencyAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-currency-admin").then((m) => m.EventPlatformCurrencyAdmin),
);

export default async function EventPlatformCurrencyPage() {
  return (
    <EventPlatformPage permission="payments.manage" path="/admin/event-platform/currency" title="Currency">
      <EventPlatformCurrencyAdmin />
    </EventPlatformPage>
  );
}
