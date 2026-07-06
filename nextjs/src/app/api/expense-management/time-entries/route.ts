import { NextResponse, type NextRequest } from "next/server";

import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import {
  canManageEmWorkspace,
  canReadEmWorkspace,
  ensureDefaultTimeEntries,
  prismaTableMissingResponse,
  resolveEmWorkspaceRequest,
} from "@/lib/em-workspace-api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function serialize(row: {
  id: bigint;
  employeeName: string;
  vendorName: string | null;
  serviceLine: string | null;
  clockInDate: Date;
  clockInTime: string | null;
  clockOutTime: string | null;
  durationHours: { toNumber?: () => number } | number | null;
  billable: string | null;
  notes: string | null;
}) {
  const hours =
    row.durationHours == null
      ? null
      : typeof row.durationHours === "number"
        ? row.durationHours
        : row.durationHours.toNumber?.() ?? Number(row.durationHours);
  return {
    id: row.id.toString(),
    employeeName: row.employeeName,
    vendorName: row.vendorName,
    serviceLine: row.serviceLine,
    clockInDate: row.clockInDate.toISOString().slice(0, 10),
    clockInTime: row.clockInTime,
    clockOutTime: row.clockOutTime,
    durationHours: hours,
    billable: row.billable,
    notes: row.notes,
  };
}

export async function GET(req: NextRequest) {
  try {
    const role = req.cookies.get("pf_role")?.value;
    const perms = await getPermissionsFromRequest(req);
    if (!canReadEmWorkspace(perms, role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ctx = await resolveEmWorkspaceRequest(req);
    if (!ctx.ok) return ctx.res;

    const db = (prisma as unknown as { emTimeEntry?: typeof prisma.emTimeEntry }).emTimeEntry;
    if (!db) {
      return NextResponse.json({ error: "Prisma client missing EmTimeEntry." }, { status: 503 });
    }

    try {
      await ensureDefaultTimeEntries(ctx.organizationId);
      const rows = await db.findMany({
        where: { organizationId: ctx.organizationId },
        orderBy: { clockInDate: "asc" },
      });
      const totalHours = rows.reduce((s, r) => {
        const h =
          r.durationHours == null
            ? 0
            : typeof r.durationHours === "number"
              ? r.durationHours
              : Number(r.durationHours);
        return s + h;
      }, 0);
      return NextResponse.json({ data: rows.map(serialize), totalHours });
    } catch (e: unknown) {
      return prismaTableMissingResponse(e, "Time entries table is missing.") ?? NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  } catch (e: unknown) {
    console.error("[GET /api/expense-management/time-entries]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.cookies.get("pf_role")?.value;
    const perms = await getPermissionsFromRequest(req);
    const ctx = await resolveEmWorkspaceRequest(req);
    if (!ctx.ok) return ctx.res;
    if (!canManageEmWorkspace(perms, role, ctx.actor)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = (prisma as unknown as { emTimeEntry?: typeof prisma.emTimeEntry }).emTimeEntry;
    if (!db) {
      return NextResponse.json({ error: "Prisma client missing EmTimeEntry." }, { status: 503 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const employeeName = String(body?.employeeName ?? "").trim();
    const clockInDateRaw = String(body?.clockInDate ?? "").trim();
    if (!employeeName || !clockInDateRaw) {
      return NextResponse.json({ error: "employeeName and clockInDate are required." }, { status: 400 });
    }

    const clockInDate = new Date(clockInDateRaw.length === 10 ? `${clockInDateRaw}T12:00:00` : clockInDateRaw);
    if (Number.isNaN(clockInDate.getTime())) {
      return NextResponse.json({ error: "Invalid clockInDate." }, { status: 400 });
    }

    try {
      const row = await db.create({
        data: {
          organizationId: ctx.organizationId,
          employeeName,
          vendorName: String(body?.vendorName ?? "").trim() || null,
          serviceLine: String(body?.serviceLine ?? "").trim() || null,
          clockInDate,
          clockInTime: String(body?.clockInTime ?? "").trim() || null,
          clockOutTime: String(body?.clockOutTime ?? "").trim() || null,
          durationHours: body?.durationHours != null ? Number(body.durationHours) : null,
          billable: String(body?.billable ?? "").trim() || null,
          notes: String(body?.notes ?? "").trim() || null,
        },
      });
      return NextResponse.json({ data: serialize(row) }, { status: 201 });
    } catch (e: unknown) {
      return prismaTableMissingResponse(e, "Time entries table is missing.") ?? NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  } catch (e: unknown) {
    console.error("[POST /api/expense-management/time-entries]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
