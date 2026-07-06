import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const LmsSubscriptionsAdminClient = dynamic(() =>
  import("@/components/lms/lms-subscriptions-admin-client").then((m) => m.LmsSubscriptionsAdminClient),
);

export default async function EventPlatformSubscriptionsPage() {
  return (
    <EventPlatformPage
      permissions={["manage-lms-subscriptions", "manage-lms", "manage-event-platform"]}
      path="/admin/event-platform/subscriptions"
      title="Subscription plans"
    >
      <LmsSubscriptionsAdminClient />
    </EventPlatformPage>
  );
}
