import { EventHostInviteClient } from "@/components/event-platform/event-host-invite-client";

type PageProps = { params: Promise<{ token: string }> };

export default async function EventHostInvitePage({ params }: PageProps) {
  const { token } = await params;
  return <EventHostInviteClient token={token} />;
}
