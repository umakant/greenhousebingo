import "server-only";

import {
  dbEventSlugCandidates,
  mapLmsEventToCard,
  mapLmsEventToDetail,
} from "@/lib/company-themes/company-site-events-mapper";
import type {
  CompanySiteEventDetail,
  CompanySiteEventsListPayload,
} from "@/lib/company-themes/company-site-events-types";
import { mapDbEvent } from "@/lib/lms-events/db-repository";
import { prisma } from "@/lib/prisma";

export async function listCompanySiteEvents(organizationId: bigint): Promise<CompanySiteEventsListPayload> {
  const rows = await prisma.lmsTrainingEvent.findMany({
    where: {
      organizationId,
      isPublic: true,
      status: { notIn: ["draft", "archived", "cancelled"] },
    },
    include: { category: true },
    orderBy: { startsAt: "asc" },
  });

  const events = rows.map((row, i) => mapLmsEventToCard(mapDbEvent(row), i));
  const states = new Set(events.map((e) => e.stateCode).filter(Boolean));

  return {
    ok: true,
    events,
    total: events.length,
    stateCount: states.size,
  };
}

export async function getCompanySiteEventByPublicSlug(
  organizationId: bigint,
  publicSlug: string,
): Promise<CompanySiteEventDetail | null> {
  const candidates = dbEventSlugCandidates(publicSlug);
  if (candidates.length === 0) return null;

  const row = await prisma.lmsTrainingEvent.findFirst({
    where: {
      organizationId,
      slug: { in: candidates },
      isPublic: true,
      status: { notIn: ["draft", "archived", "cancelled"] },
    },
    include: { category: true },
  });

  if (!row) return null;
  return mapLmsEventToDetail(mapDbEvent(row));
}
