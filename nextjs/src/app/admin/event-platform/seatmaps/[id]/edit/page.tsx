import dynamic from "next/dynamic";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

const EventPlatformSeatmapBuilder = dynamic(() =>
  import("@/components/event-platform/event-platform-seatmap-builder").then((m) => m.EventPlatformSeatmapBuilder),
);

type Props = { params: Promise<{ id: string }> };

export default async function Page(props: Props) {
  const { id } = await props.params;
  return (
    <EventPlatformPage
      permission="cms.manage"
      path={`/admin/event-platform/seatmaps/${id}/edit`}
      title="Edit seat map"
      breadcrumbs={[
        { label: "Event Platform", url: "/admin/event-platform" },
        { label: "Seat Maps", url: "/admin/event-platform/seatmaps" },
        { label: "Edit" },
      ]}
    >
      <EventPlatformSeatmapBuilder seatmapId={id} />
    </EventPlatformPage>
  );
}
