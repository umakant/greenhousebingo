import { NextRequest, NextResponse } from "next/server";

import { listEventBingoFaqs, serializeEventBingoFaq } from "@/lib/event-platform/bingo-faqs/bingo-faq-service";
import { canAccessLmsEventAdminFromRequest } from "@/lib/lms-events/admin-access";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

/** Active event FAQs for event create/edit forms (LMS event admin). */
export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const allowed = await canAccessLmsEventAdminFromRequest(req);
  if (!allowed) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }
  try {
    const rows = await listEventBingoFaqs(actor.organizationId);
    const items = rows
      .filter((f: { status: string }) => f.status === "active")
      .map(serializeEventBingoFaq);
    return NextResponse.json({ ok: true, items });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not load FAQs.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
