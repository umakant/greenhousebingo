import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import {
  computeLaunchpadState,
  generateLaunchpadTasks,
} from "@/lib/compliance/compliance-launchpad-engine";
import { computeComplianceScores } from "@/lib/compliance/compliance-scoring";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-launchpad");
  if (!gate.ok) return gate.response;

  const [launchpad, scores] = await Promise.all([
    computeLaunchpadState(gate.actor.organizationId),
    computeComplianceScores(gate.actor.organizationId),
  ]);

  return NextResponse.json({
    ok: true,
    ...launchpad,
    scores: {
      overall: scores.overall,
      auditReadiness: scores.auditReadiness,
    },
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-launchpad");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (String(body.action ?? "") === "generate_tasks") {
    const created = await generateLaunchpadTasks(gate.actor.organizationId);
    const launchpad = await computeLaunchpadState(gate.actor.organizationId);
    return NextResponse.json({ ok: true, created, ...launchpad });
  }

  return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
}
