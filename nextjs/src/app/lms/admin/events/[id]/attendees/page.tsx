import { redirect } from "next/navigation";

import { lmsEventAdminAttendeesPath } from "@/lib/lms-events/paths";

type Props = { params: Promise<{ id: string }> };

export default async function LmsAdminEventAttendeesRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(lmsEventAdminAttendeesPath(id));
}
