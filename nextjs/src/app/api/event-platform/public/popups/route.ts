import { NextRequest, NextResponse } from "next/server";

import { resolveEventPlatformTenantFromCookies } from "@/lib/event-platform/tenant-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function serializePopup(p: {
  id: bigint;
  title: string;
  popupType: string;
  contentHtml: string | null;
  mediaUrl: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  frequency: string;
  displayLocation: string;
}) {
  return {
    id: p.id.toString(),
    title: p.title,
    popupType: p.popupType,
    contentHtml: p.contentHtml,
    mediaUrl: p.mediaUrl,
    buttonText: p.buttonText,
    buttonUrl: p.buttonUrl,
    frequency: p.frequency,
    displayLocation: p.displayLocation,
  };
}

export async function GET(req: NextRequest) {
  const tenant = await resolveEventPlatformTenantFromCookies();
  if (!tenant) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const location = req.nextUrl.searchParams.get("location")?.trim() || "all";
  const now = new Date();

  const rows = await prisma.eventAnnouncementPopup.findMany({
    where: {
      organizationId: tenant.organizationId,
      isActive: true,
      archivedAt: null,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        { OR: [{ displayLocation: "all" }, { displayLocation: location }] },
      ],
    },
    orderBy: [{ priorityOrder: "asc" }, { createdAt: "desc" }],
    take: 5,
    select: {
      id: true,
      title: true,
      popupType: true,
      contentHtml: true,
      mediaUrl: true,
      buttonText: true,
      buttonUrl: true,
      frequency: true,
      displayLocation: true,
    },
  });

  return NextResponse.json({ ok: true, items: rows.map(serializePopup) });
}
