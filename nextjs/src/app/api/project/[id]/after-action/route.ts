import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProjectOpsContext, logProjectActivity } from "@/lib/project-operations-api";

export const dynamic = "force-dynamic";

function serialize(row: {
  projectId: bigint;
  eventSummary: string | null;
  wentWell: string | null;
  improvements: string | null;
  actionItems: string | null;
  staffPerformance: string | null;
}) {
  return {
    event_summary: row.eventSummary,
    went_well: row.wentWell,
    improvements: row.improvements,
    action_items: row.actionItems,
    staff_performance: row.staffPerformance,
  };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const row = await prisma.projectAfterActionReport.findUnique({ where: { projectId } });
  if (!row) {
    return NextResponse.json({
      data: {
        event_summary: null,
        went_well: null,
        improvements: null,
        action_items: null,
        staff_performance: null,
      },
    });
  }
  return NextResponse.json({ data: serialize(row) });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const data = {
    eventSummary: typeof body?.event_summary === "string" ? body.event_summary : undefined,
    wentWell: typeof body?.went_well === "string" ? body.went_well : undefined,
    improvements: typeof body?.improvements === "string" ? body.improvements : undefined,
    actionItems: typeof body?.action_items === "string" ? body.action_items : undefined,
    staffPerformance: typeof body?.staff_performance === "string" ? body.staff_performance : undefined,
  };

  const row = await prisma.projectAfterActionReport.upsert({
    where: { projectId },
    create: { projectId, ...data },
    update: data,
  });

  await logProjectActivity(projectId, auth.actor.id, auth.actor.type ?? "user", "after_action", "Updated after action report");
  return NextResponse.json({ data: serialize(row) });
}
