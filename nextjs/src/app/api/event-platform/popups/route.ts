import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const popupCreateSchema = z.object({
  title: z.string().min(1).max(255),
  popupType: z.string().min(1).max(64),
  contentHtml: z.string().max(100_000).optional().nullable(),
  mediaUrl: z.string().max(2048).optional().nullable(),
  buttonText: z.string().max(128).optional().nullable(),
  buttonUrl: z.string().max(2048).optional().nullable(),
  isActive: z.boolean().optional(),
  priorityOrder: z.number().int().optional(),
  displayLocation: z.string().max(64).optional(),
  frequency: z.string().max(64).optional(),
  audience: z.string().max(64).optional(),
});

const popupUpdateSchema = popupCreateSchema.partial();

function serializePopup(p: {
  id: bigint;
  title: string;
  popupType: string;
  isActive: boolean;
  priorityOrder: number;
  displayLocation: string;
  frequency: string;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: p.id.toString(),
    title: p.title,
    popupType: p.popupType,
    isActive: p.isActive,
    priorityOrder: p.priorityOrder,
    displayLocation: p.displayLocation,
    frequency: p.frequency,
    startsAt: p.startsAt?.toISOString() ?? null,
    endsAt: p.endsAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "cms.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const rows = await prisma.eventAnnouncementPopup.findMany({
    where: { organizationId: actor.organizationId, archivedAt: null },
    orderBy: [{ priorityOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ ok: true, items: rows.map(serializePopup) });
}

export async function POST(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "cms.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const body = await req.json().catch(() => null);
  const parsed = popupCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const p = parsed.data;
  const created = await prisma.eventAnnouncementPopup.create({
    data: {
      organizationId: actor.organizationId,
      title: p.title.trim(),
      popupType: p.popupType.trim(),
      contentHtml: p.contentHtml ?? null,
      mediaUrl: p.mediaUrl ?? null,
      buttonText: p.buttonText ?? null,
      buttonUrl: p.buttonUrl ?? null,
      isActive: p.isActive ?? false,
      priorityOrder: p.priorityOrder ?? 0,
      displayLocation: p.displayLocation ?? "all",
      frequency: p.frequency ?? "once_per_session",
      audience: p.audience ?? "all",
      createdById: actor.userId,
      updatedById: actor.userId,
    },
  });

  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: "popup.created",
    entityType: "event_announcement_popup",
    entityId: created.id.toString(),
  });

  return NextResponse.json({ ok: true, item: serializePopup(created) });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "cms.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const idRaw = req.nextUrl.searchParams.get("id");
  if (!idRaw) return NextResponse.json({ ok: false, message: "Missing id." }, { status: 400 });
  let id: bigint;
  try {
    id = BigInt(idRaw);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = popupUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const p = parsed.data;

  const updated = await prisma.eventAnnouncementPopup.updateMany({
    where: { id, organizationId: actor.organizationId, archivedAt: null },
    data: {
      ...(p.title !== undefined ? { title: p.title.trim() } : {}),
      ...(p.popupType !== undefined ? { popupType: p.popupType.trim() } : {}),
      ...(p.contentHtml !== undefined ? { contentHtml: p.contentHtml } : {}),
      ...(p.mediaUrl !== undefined ? { mediaUrl: p.mediaUrl } : {}),
      ...(p.buttonText !== undefined ? { buttonText: p.buttonText } : {}),
      ...(p.buttonUrl !== undefined ? { buttonUrl: p.buttonUrl } : {}),
      ...(p.isActive !== undefined ? { isActive: p.isActive } : {}),
      ...(p.priorityOrder !== undefined ? { priorityOrder: p.priorityOrder } : {}),
      ...(p.displayLocation !== undefined ? { displayLocation: p.displayLocation } : {}),
      ...(p.frequency !== undefined ? { frequency: p.frequency } : {}),
      ...(p.audience !== undefined ? { audience: p.audience } : {}),
      updatedById: actor.userId,
      updatedAt: new Date(),
    },
  });
  if (updated.count === 0) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const row = await prisma.eventAnnouncementPopup.findFirst({ where: { id, organizationId: actor.organizationId } });
  return NextResponse.json({ ok: true, item: row ? serializePopup(row) : null });
}
