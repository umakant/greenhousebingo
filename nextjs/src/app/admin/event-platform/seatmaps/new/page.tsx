import { redirect } from "next/navigation";

import { EventPlatformPage } from "@/components/event-platform/event-platform-page";

export default async function Page() {
  redirect("/admin/event-platform/seatmaps");
}
