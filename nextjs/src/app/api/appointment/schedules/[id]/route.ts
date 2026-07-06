import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";
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

function scheduleStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "approved") return "Approved";
  if (s === "reject" || s === "rejected") return "Rejected";
  if (s === "complete" || s === "completed") return "Completed";
  if (s === "pending") return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "view-schedules", "manage-schedules", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const { id } = await params;
  try {
    const row = await prisma.schedule.findUnique({
      where: { id: BigInt(id) },
      include: { appointment: { select: { id: true, appointmentName: true } } },
    });
    if (!row) return notFound();
    return jsonR({ data: ser(row) });
  } catch { return serverError(); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "schedule-actions", "manage-schedules", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => null);
  try {
    const prev = await prisma.schedule.findFirst({
      where: { id: BigInt(id), createdBy: getCompanyId(actor) },
      include: { appointment: { select: { appointmentName: true } } },
    });
    if (!prev) return notFound();

    const data: any = {};
    if (body?.status !== undefined) data.status = body.status;
    if (body?.cancel_description !== undefined) data.cancelDescription = body.cancel_description;
    if (body?.date !== undefined) data.date = body.date ? new Date(body.date) : null;
    if (body?.start_time !== undefined) data.startTime = body.start_time;
    if (body?.end_time !== undefined) data.endTime = body.end_time;
    const row = await prisma.schedule.update({
      where: { id: BigInt(id) },
      data,
      include: { appointment: { select: { id: true, appointmentName: true } } },
    });

    if (body?.status !== undefined && prev.status !== row.status && row.email?.trim()) {
      const cid = getCompanyId(actor);
      const settings = await getSettingsForOwner(cid);
      if (isCompanyEmailNotificationEnabled(settings, "Appointment Status Update")) {
        sendTemplatedEmailAsync({
          templateName: "Appointment Status Update",
          mailTo: [row.email.trim()],
          ownerId: cid,
          variables: {
            appointment_name: row.appointment?.appointmentName ?? "Appointment",
            appointment_user_name: row.name ?? "-",
            appointment_user_email: row.email ?? "-",
            appointment_date: fmtScheduleDate(row.date),
            appointment_time: fmtScheduleTimeRange(row.startTime, row.endTime),
            appointment_number: row.uniqueId,
            appointment_status: scheduleStatusLabel(row.status),
          },
        });
      }
    }

    return jsonR({ data: ser(row) });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "delete-schedules", "manage-schedules", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const { id } = await params;
  try {
    await prisma.schedule.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ success: true });
  } catch { return serverError(); }
}
