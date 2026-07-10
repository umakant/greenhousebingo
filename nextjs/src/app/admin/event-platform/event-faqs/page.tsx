import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformEventFaqsAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-event-faqs-admin").then((m) => m.EventPlatformEventFaqsAdmin),
);

export default async function EventPlatformEventFaqsPage() {
  return (
    <EventPlatformPage permission="eventFaqs.view" path="/admin/event-platform/event-faqs" title="Event FAQs" hidePageTitle>
      <EventPlatformEventFaqsAdmin />
    </EventPlatformPage>
  );
}
