import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformPageEditClient = dynamic(() =>
  import("@/components/event-platform/event-platform-page-edit-client").then((m) => m.EventPlatformPageEditClient),
);

type Props = { params: Promise<{ id: string }> };

export default async function EventPlatformPageEditPage(props: Props) {
  const { id } = await props.params;
  return (
    <EventPlatformPage
      permission="cms.manage"
      path={`/admin/event-platform/pages/${id}/edit`}
      title="Edit Page"
      breadcrumbs={[{ label: "Pages", url: "/admin/event-platform/pages" }, { label: "Edit" }]}
    >
      <EventPlatformPageEditClient pageId={id} />
    </EventPlatformPage>
  );
}
