import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformSponsorsAdmin = dynamic(() =>
  import("@/components/event-platform/event-platform-sponsors-admin").then((m) => m.EventPlatformSponsorsAdmin),
);

export default async function EventPlatformSponsorsPage() {
  return (
    <EventPlatformPage permission="sponsors.view" path="/admin/event-platform/sponsors" title="Sponsors" hidePageTitle>
      <EventPlatformSponsorsAdmin />
    </EventPlatformPage>
  );
}
