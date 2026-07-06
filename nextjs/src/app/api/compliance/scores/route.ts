import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import { computeComplianceScores } from "@/lib/compliance/compliance-scoring";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-dashboard");
  if (!gate.ok) return gate.response;

  const scores = await computeComplianceScores(gate.actor.organizationId);
  return NextResponse.json({ ok: true, scores });
}
