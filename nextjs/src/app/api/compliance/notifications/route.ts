import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import { scanComplianceNotifications } from "@/lib/compliance/compliance-notification-engine";
import { serializeNotification } from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-dashboard");
  if (!gate.ok) return gate.response;

  const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";
  const rows = await prisma.complianceNotification.findMany({
    where: {
      organizationId: gate.actor.organizationId,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    ok: true,
    items: rows.map(serializeNotification),
    unreadCount: unreadOnly ? rows.length : await prisma.complianceNotification.count({
      where: { organizationId: gate.actor.organizationId, readAt: null },
    }),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-dashboard");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (String(body.action ?? "") === "scan") {
    const created = await scanComplianceNotifications(gate.actor.organizationId);
    return NextResponse.json({ ok: true, created });
  }

  return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
}
