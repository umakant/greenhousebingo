import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function ser(r: any) {
  return { ...r, id: r.id.toString(), createdBy: r.createdBy?.toString() ?? null, creatorId: r.creatorId?.toString() ?? null };
}

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-appointment-hours", "manage-appointment-settings", "manage-appointment", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  try {
    const rows = await prisma.appointmentHour.findMany({
      where: { createdBy: companyId },
      orderBy: { id: "asc" },
    });
    return jsonR({ data: rows.map(ser) });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "create-appointment-hours", "manage-appointment-hours", "manage-appointment-settings", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.hours)) return NextResponse.json({ error: "hours array required" }, { status: 400 });
  try {
    const results = [];
    for (const h of body.hours) {
      const existing = await prisma.appointmentHour.findFirst({
        where: { dayName: h.day_name, createdBy: companyId },
      });
      if (existing) {
        const updated = await prisma.appointmentHour.update({
          where: { id: existing.id },
          data: {
            startTime: h.start_time ?? null,
            endTime: h.end_time ?? null,
            dayOff: h.day_off ?? false,
          },
        });
        results.push(ser(updated));
      } else {
        const created = await prisma.appointmentHour.create({
          data: {
            dayName: h.day_name,
            startTime: h.start_time ?? null,
            endTime: h.end_time ?? null,
            dayOff: h.day_off ?? false,
            creatorId: companyId,
            createdBy: companyId,
          },
        });
        results.push(ser(created));
      }
    }
    return jsonR({ data: results });
  } catch { return serverError(); }
}
