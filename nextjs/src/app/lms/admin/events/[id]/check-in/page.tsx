import { redirect } from "next/navigation";

import { lmsEventAdminCheckInPath } from "@/lib/lms-events/paths";

type Props = { params: Promise<{ id: string }> };

export default async function LmsAdminEventCheckInRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(lmsEventAdminCheckInPath(id));
}
