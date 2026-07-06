import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { eventCustomPageUpdateSchema } from "@/lib/event-platform/pages/page-schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseId(raw: string): bigint | null {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function serializePageFull(p: {
  id: bigint;
  title: string;
  slug: string;
  contentHtml: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  featuredImage: string | null;
  status: string;
  visibility: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
}) {
  return {
    id: p.id.toString(),
    title: p.title,
    slug: p.slug,
    contentHtml: p.contentHtml,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    featuredImage: p.featuredImage,
    status: p.status,
    visibility: p.visibility,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt?.toISOString() ?? null,
  };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireEventPlatformApi(req, "cms.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const id = parseId((await ctx.params).id);
  if (id == null) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  const row = await prisma.eventCustomPage.findFirst({
    where: { id, organizationId: actor.organizationId, archivedAt: null },
  });
  if (!row) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true, item: serializePageFull(row) });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireEventPlatformApi(req, "cms.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const id = parseId((await ctx.params).id);
  if (id == null) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const existing = await prisma.eventCustomPage.findFirst({
    where: { id, organizationId: actor.organizationId, archivedAt: null },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = eventCustomPageUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const p = parsed.data;
  const nextStatus = p.status ?? existing.status;

  const updated = await prisma.eventCustomPage.update({
    where: { id },
    data: {
      ...(p.title !== undefined ? { title: p.title.trim() } : {}),
      ...(p.slug !== undefined ? { slug: p.slug.trim() } : {}),
      ...(p.contentHtml !== undefined ? { contentHtml: p.contentHtml } : {}),
      ...(p.seoTitle !== undefined ? { seoTitle: p.seoTitle } : {}),
      ...(p.seoDescription !== undefined ? { seoDescription: p.seoDescription } : {}),
      ...(p.featuredImage !== undefined ? { featuredImage: p.featuredImage } : {}),
      ...(p.visibility !== undefined ? { visibility: p.visibility } : {}),
      ...(p.status !== undefined ? { status: p.status } : {}),
      publishedAt:
        nextStatus === "published" && !existing.publishedAt ? new Date() : existing.publishedAt,
      updatedById: actor.userId,
    },
  });

  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: "page.updated",
    entityType: "event_custom_page",
    entityId: id.toString(),
  });

  return NextResponse.json({ ok: true, item: serializePageFull(updated) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireEventPlatformApi(req, "cms.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const id = parseId((await ctx.params).id);
  if (id == null) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  await prisma.eventCustomPage.updateMany({
    where: { id, organizationId: actor.organizationId },
    data: { status: "archived", archivedAt: new Date(), updatedById: actor.userId },
  });

  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: "page.archived",
    entityType: "event_custom_page",
    entityId: id.toString(),
  });

  return NextResponse.json({ ok: true });
}
