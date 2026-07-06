import { redirect } from "next/navigation";

import { lmsEventAdminTicketsPath } from "@/lib/lms-events/paths";

type Props = { params: Promise<{ id: string }> };

export default async function LmsAdminEventTicketsRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(lmsEventAdminTicketsPath(id));
}
