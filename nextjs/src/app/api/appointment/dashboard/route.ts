import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getCompanyId, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = getCompanyId(actor);
  try {
    const [
      totalAppointments,
      enabledAppointments,
      approvedSchedules,
      rejectedSchedules,
      pendingSchedules,
      completedSchedules,
      totalCallbacks,
      pendingCallbacks,
      totalQuestions,
    ] = await Promise.all([
      prisma.appointment.count({ where: { createdBy: companyId } }),
      prisma.appointment.count({ where: { createdBy: companyId, enabled: true } }),
      prisma.schedule.count({ where: { createdBy: companyId, status: "approved" } }),
      prisma.schedule.count({ where: { createdBy: companyId, status: "rejected" } }),
      prisma.schedule.count({ where: { createdBy: companyId, status: "pending" } }),
      prisma.schedule.count({ where: { createdBy: companyId, status: "complete" } }),
      prisma.appointmentCallback.count({ where: { createdBy: companyId } }),
      prisma.appointmentCallback.count({ where: { createdBy: companyId, status: "pending" } }),
      prisma.question.count({ where: { createdBy: companyId } }),
    ]);

    const totalSchedules = approvedSchedules + rejectedSchedules + pendingSchedules + completedSchedules;

    // All appointments (for carousel)
    const appointments = await prisma.appointment.findMany({
      where: { createdBy: companyId },
      orderBy: { id: "asc" },
      select: {
        id: true,
        appointmentName: true,
        appointmentType: true,
        weekDay: true,
        duration: true,
        enabled: true,
        createdAt: true,
      },
    });

    // All schedules (for calendar) — return month-range subset if date param provided
    const allSchedules = await prisma.schedule.findMany({
      where: { createdBy: companyId },
      include: { appointment: { select: { appointmentName: true } } },
      orderBy: { date: "asc" },
      take: 500,
    });

    // Recent schedules (for sidebar list)
    const recentSchedules = await prisma.schedule.findMany({
      where: { createdBy: companyId },
      include: { appointment: { select: { appointmentName: true } } },
      orderBy: { date: "desc" },
      take: 10,
    });

    return jsonR({
      stats: {
        totalAppointments,
        enabledAppointments,
        totalSchedules,
        approvedSchedules,
        rejectedSchedules,
        pendingSchedules,
        completedSchedules,
        totalCallbacks,
        pendingCallbacks,
        totalQuestions,
      },
      appointments: appointments.map((a) => ({
        id: Number(a.id),
        name: a.appointmentName,
        type: a.appointmentType === "1" ? "Paid" : "Free",
        weekDay: (() => {
          try {
            const w = a.weekDay;
            if (Array.isArray(w)) return w.join(", ");
            if (typeof w === "string") return JSON.parse(w).join(", ");
            return "";
          } catch { return ""; }
        })(),
        date: a.createdAt ? a.createdAt.toISOString().slice(0, 10) : null,
        enabled: a.enabled,
      })),
      schedules: allSchedules.map((s) => ({
        id: Number(s.id),
        name: s.name,
        appointmentName: s.appointment?.appointmentName ?? null,
        date: s.date ? s.date.toISOString().slice(0, 10) : null,
        startTime: s.startTime,
        status: s.status,
      })),
      recentSchedules: recentSchedules.map((s) => ({
        id: Number(s.id),
        name: s.name,
        appointmentName: s.appointment?.appointmentName ?? null,
        date: s.date ? s.date.toISOString().slice(0, 10) : null,
        startTime: s.startTime,
        status: s.status,
      })),
    });
  } catch (e) {
    console.error("[appointment/dashboard]", e);
    return serverError();
  }
}
