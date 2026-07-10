import { NextRequest, NextResponse } from "next/server";

import { eventBingoFaqCreateSchema } from "@/lib/event-platform/bingo-faqs/bingo-faq-schemas";
import { listEventBingoFaqs, serializeEventBingoFaq } from "@/lib/event-platform/bingo-faqs/bingo-faq-service";
import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "eventFaqs.view");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const rows = await listEventBingoFaqs(actor.organizationId);
    return NextResponse.json({ ok: true, items: rows.map(serializeEventBingoFaq) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "List failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "eventFaqs.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const body = await req.json().catch(() => null);
    const parsed = eventBingoFaqCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }
    const p = parsed.data;

    const created = await prisma.eventBingoFaq.create({
      data: {
        organizationId: actor.organizationId,
        question: p.question.trim(),
        answer: p.answer.trim(),
        sortOrder: p.sortOrder ?? 0,
        status: p.status ?? "active",
        createdById: actor.userId,
        updatedById: actor.userId,
      },
    });

    await writeEventAuditLog({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "event_faq.created",
      entityType: "event_bingo_faq",
      entityId: created.id.toString(),
    });

    return NextResponse.json({ ok: true, item: serializeEventBingoFaq(created) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Create failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
