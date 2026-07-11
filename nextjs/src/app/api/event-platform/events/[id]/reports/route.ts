import { NextRequest, NextResponse } from "next/server";

import { buildEventReport } from "@/lib/event-platform/reports/event-report-service";
import { eventReportToHtml } from "@/lib/event-platform/reports/event-report-html";
import { htmlToPdfBuffer } from "@/lib/html-to-pdf-server";
import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const actor = await requireEventPlatformApi(req, "events.view");
  if (isEventPlatformApiError(actor)) return actor;

  const { id } = await ctx.params;
  const format = req.nextUrl.searchParams.get("format") ?? "json";

  try {
    const report = await buildEventReport(actor.organizationId, id);
    if (!report) {
      return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
    }

    if (format === "json") {
      return NextResponse.json({ ok: true, report });
    }

    const html = eventReportToHtml(report);

    if (format === "html") {
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (format === "pdf") {
      const pdf = await htmlToPdfBuffer(html);
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="event-report-${id}.pdf"`,
        },
      });
    }

    return NextResponse.json({ ok: false, message: "Unsupported format." }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Report generation failed." },
      { status: 500 },
    );
  }
}
