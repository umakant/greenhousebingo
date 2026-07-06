import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";
import { randomUUID } from "crypto";
import { getSettingsForOwner } from "@/lib/settings-service";
import { isCompanyEmailNotificationEnabled, sendTemplatedEmailAsync } from "@/lib/send-templated-email";

function fmtScheduleDate(d: Date | null | undefined): string {
  if (!d) return "-";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const y = d.getUTCFullYear();
  return `${day}-${month}-${y}`;
}

function fmtScheduleTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  const fmt = (t: string) => {
    const raw = t.trim().slice(0, 8);
    const d = new Date(`1970-01-01T${raw}`);
    if (isNaN(d.getTime())) return t;
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };
  if (!start?.trim() && !end?.trim()) return "-";
  return `${fmt(start ?? "")} - ${fmt(end ?? "")}`;
}

export const dynamic = "force-dynamic";

function ser(r: any) {
  return {
    ...r,
    id: r.id.toString(),
    appointmentId: r.appointmentId?.toString() ?? null,
    userId: r.userId?.toString() ?? null,
    createdBy: r.createdBy?.toString() ?? null,
    creatorId: r.creatorId?.toString() ?? null,
    appointment: r.appointment ? { ...r.appointment, id: r.appointment.id.toString() } : null,
  };
}

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-schedules", "manage-appointment", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { searchParams: s } = new URL(req.url);
  const page = Math.max(1, Number(s.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 15)));
  const skip = (page - 1) * perPage;
  const where: any = { createdBy: companyId };
  if (s.get("status")) where.status = s.get("status");
  if (s.get("appointment_id")) where.appointmentId = BigInt(s.get("appointment_id")!);
  if (s.get("search")) where.OR = [
    { name: { contains: s.get("search"), mode: "insensitive" } },
    { email: { contains: s.get("search"), mode: "insensitive" } },
  ];
  try {
    const [rows, total] = await Promise.all([
      prisma.schedule.findMany({
        where,
        include: { appointment: { select: { id: true, appointmentName: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      prisma.schedule.count({ where }),
    ]);
    return jsonR({ data: rows.map(ser), total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1 });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-schedules", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.appointment_id) return NextResponse.json({ error: "name and appointment_id required" }, { status: 400 });
  try {
    const cid = getCompanyId(actor);
    const appointment = await prisma.appointment.findFirst({
      where: { id: BigInt(body.appointment_id), createdBy: cid },
      select: { appointmentName: true },
    });
    const row = await prisma.schedule.create({
      data: {
        uniqueId: randomUUID(),
        name: body.name,
        email: body.email ?? null,
        phone: body.phone ?? null,
        date: body.date ? new Date(body.date) : null,
        startTime: body.start_time ?? null,
        endTime: body.end_time ?? null,
        appointmentId: BigInt(body.appointment_id),
        questions: body.questions ?? null,
        status: body.status ?? "pending",
        creatorId: cid,
        createdBy: cid,
      },
      include: { appointment: { select: { appointmentName: true } } },
    });

    if (row.email?.trim()) {
      const settings = await getSettingsForOwner(cid);
      if (isCompanyEmailNotificationEnabled(settings, "Appointment Booked")) {
        sendTemplatedEmailAsync({
          templateName: "Appointment Booked",
          mailTo: [row.email.trim()],
          ownerId: cid,
          variables: {
            appointment_name: row.appointment?.appointmentName ?? appointment?.appointmentName ?? "Appointment",
            appointment_user_name: row.name ?? "-",
            appointment_user_email: row.email ?? "-",
            appointment_date: fmtScheduleDate(row.date),
            appointment_time: fmtScheduleTimeRange(row.startTime, row.endTime),
            appointment_number: row.uniqueId,
          },
        });
      }
    }

    return jsonR({ data: ser(row) }, { status: 201 });
  } catch { return serverError(); }
}
