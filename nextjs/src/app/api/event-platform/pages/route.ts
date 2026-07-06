import { NextRequest, NextResponse } from "next/server";

import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import {
  eventCustomPageCreateSchema,
  slugifyPageTitle,
} from "@/lib/event-platform/pages/page-schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function serializePage(p: {
  id: bigint;
  title: string;
  slug: string;
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
    status: p.status,
    visibility: p.visibility,
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt?.toISOString() ?? null,
  };
}

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "cms.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const rows = await prisma.eventCustomPage.findMany({
    where: { organizationId: actor.organizationId, archivedAt: null },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      visibility: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ ok: true, items: rows.map(serializePage) });
}

export async function POST(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "cms.manage");
  if (isEventPlatformApiError(actor)) return actor;
  const body = await req.json().catch(() => null);
  const parsed = eventCustomPageCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const p = parsed.data;
  const slug = (p.slug?.trim() || slugifyPageTitle(p.title)) || "page";
  const status = p.status ?? "draft";

  const created = await prisma.eventCustomPage.create({
    data: {
      organizationId: actor.organizationId,
      title: p.title.trim(),
      slug,
      contentHtml: p.contentHtml ?? null,
      seoTitle: p.seoTitle ?? null,
      seoDescription: p.seoDescription ?? null,
      featuredImage: p.featuredImage ?? null,
      status,
      visibility: p.visibility ?? "public",
      publishedAt: status === "published" ? new Date() : null,
      createdById: actor.userId,
      updatedById: actor.userId,
    },
  });

  await writeEventAuditLog({
    organizationId: actor.organizationId,
    actorUserId: actor.userId,
    action: "page.created",
    entityType: "event_custom_page",
    entityId: created.id.toString(),
  });

  return NextResponse.json({ ok: true, item: serializePage(created) });
}
