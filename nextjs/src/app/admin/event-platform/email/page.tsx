import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformEmailAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-email-admin").then((m) => m.EventPlatformEmailAdmin),
);

export default async function EventPlatformEmailPage() {
  return (
    <EventPlatformPage permission="settings.manage" path="/admin/event-platform/email" title="Email Settings">
      <EventPlatformEmailAdmin />
    </EventPlatformPage>
  );
}
