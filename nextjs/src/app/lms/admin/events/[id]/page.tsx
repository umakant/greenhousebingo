import { redirect } from "next/navigation";

import { lmsEventAdminDetailPath } from "@/lib/lms-events/paths";

type Props = { params: Promise<{ id: string }> };

export default async function LmsAdminEventDetailRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(lmsEventAdminDetailPath(id));
}
