import { NextRequest, NextResponse } from "next/server";

import { eventBingoFaqUpdateSchema } from "@/lib/event-platform/bingo-faqs/bingo-faq-schemas";
import { getEventBingoFaqById, serializeEventBingoFaq } from "@/lib/event-platform/bingo-faqs/bingo-faq-service";
import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const actor = await requireEventPlatformApi(req, "eventFaqs.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const { id: idRaw } = await ctx.params;
    let id: bigint;
    try {
      id = BigInt(idRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid FAQ id." }, { status: 400 });
    }

    const existing = await getEventBingoFaqById(actor.organizationId, id);
    if (!existing) {
      return NextResponse.json({ ok: false, message: "FAQ not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = eventBingoFaqUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    const p = parsed.data;

    const updated = await prisma.eventBingoFaq.update({
      where: { id: existing.id },
      data: {
        question: p.question?.trim() ?? undefined,
        answer: p.answer?.trim() ?? undefined,
        sortOrder: p.sortOrder ?? undefined,
        status: p.status ?? undefined,
        archivedAt: p.status === "archived" ? new Date() : p.status === "active" ? null : undefined,
        updatedById: actor.userId,
        updatedAt: new Date(),
      },
    });

    await writeEventAuditLog({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "event_faq.updated",
      entityType: "event_bingo_faq",
      entityId: updated.id.toString(),
    });

    return NextResponse.json({ ok: true, item: serializeEventBingoFaq(updated) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Update failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const actor = await requireEventPlatformApi(req, "eventFaqs.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const { id: idRaw } = await ctx.params;
    let id: bigint;
    try {
      id = BigInt(idRaw);
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid FAQ id." }, { status: 400 });
    }

    const existing = await getEventBingoFaqById(actor.organizationId, id);
    if (!existing) {
      return NextResponse.json({ ok: false, message: "FAQ not found." }, { status: 404 });
    }

    await prisma.eventBingoFaq.update({
      where: { id: existing.id },
      data: { status: "archived", archivedAt: new Date(), updatedById: actor.userId, updatedAt: new Date() },
    });

    await writeEventAuditLog({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "event_faq.archived",
      entityType: "event_bingo_faq",
      entityId: existing.id.toString(),
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Archive failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
