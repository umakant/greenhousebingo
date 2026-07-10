import "server-only";

import type { EventHostsListPayload } from "@/lib/event-platform/hosts/host-types";
import { listEventHostInvitations, listEventHosts } from "@/lib/event-platform/hosts/host-service";

export async function getEventHostsListPayload(organizationId: bigint): Promise<EventHostsListPayload> {
  const [items, invitations] = await Promise.all([
    listEventHosts(organizationId),
    listEventHostInvitations(organizationId),
  ]);
  return { items, invitations };
}
