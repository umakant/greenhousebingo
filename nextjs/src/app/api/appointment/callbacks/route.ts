import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

function ser(r: any) {
  return {
    ...r,
    id: r.id.toString(),
    scheduleId: r.scheduleId?.toString() ?? null,
    appointmentId: r.appointmentId?.toString() ?? null,
    userId: r.userId?.toString() ?? null,
    createdBy: r.createdBy?.toString() ?? null,
    creatorId: r.creatorId?.toString() ?? null,
    schedule: r.schedule ? { ...r.schedule, id: r.schedule.id.toString() } : null,
    appointment: r.appointment ? { ...r.appointment, id: r.appointment.id.toString() } : null,
  };
}

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-appointment-callbacks", "manage-appointment", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { searchParams: s } = new URL(req.url);
  const page = Math.max(1, Number(s.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 15)));
  const skip = (page - 1) * perPage;
  const where: any = { createdBy: companyId };
  if (s.get("status")) where.status = s.get("status");
  try {
    const [rows, total] = await Promise.all([
      prisma.appointmentCallback.findMany({
        where,
        include: {
          schedule: { select: { id: true, name: true, email: true } },
          appointment: { select: { id: true, appointmentName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      prisma.appointmentCallback.count({ where }),
    ]);
    return jsonR({ data: rows.map(ser), total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1 });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-appointment-callbacks", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body?.schedule_id) return NextResponse.json({ error: "schedule_id required" }, { status: 400 });
  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: BigInt(body.schedule_id) }, select: { appointmentId: true } });
    const row = await prisma.appointmentCallback.create({
      data: {
        scheduleId: BigInt(body.schedule_id),
        uniqueCode: randomUUID().slice(0, 20),
        appointmentId: schedule?.appointmentId ?? null,
        reason: body.reason ?? null,
        date: body.date ? new Date(body.date) : null,
        startTime: body.start_time ?? null,
        endTime: body.end_time ?? null,
        status: "pending",
        creatorId: getCompanyId(actor),
        createdBy: getCompanyId(actor),
      },
    });
    return jsonR({ data: ser(row) }, { status: 201 });
  } catch { return serverError(); }
}
