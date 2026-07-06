import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-hrm")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);

  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    /** Matches `hrm_attendances.date` (PostgreSQL DATE → UTC midnight). Local day range misses rows — use calendar equality. */
    const todayAttendanceDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    // Calendar window: prev month .. next 2 months
    const calStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const calEnd   = new Date(today.getFullYear(), today.getMonth() + 3, 0);

    const [
      totalEmployees, activeEmployees, departments, branches,
      pendingLeaves, todayPresent, pendingResignations,
      promotions, terminations,
      deptDist,
      onLeaveTodayRaw,
      recentLeaveRaw,
      todayAttendanceIds,
      recentAwards,
      upcomingHolidays,
      recentAnnouncementRows,
    ] = await Promise.all([
      prisma.hrmEmployee.count({ where: { createdBy: companyId } }),
      prisma.hrmEmployee.count({ where: { createdBy: companyId, status: "active" } }),
      prisma.hrmDepartment.count({ where: { createdBy: companyId } }),
      prisma.hrmBranch.count({ where: { createdBy: companyId } }),
      prisma.hrmLeaveApplication.count({ where: { status: "pending", employee: { createdBy: companyId } } }),
      prisma.hrmAttendance.count({ where: { date: todayAttendanceDate, status: "present", employee: { createdBy: companyId } } }),
      prisma.hrmResignation.count({ where: { status: "pending", employee: { createdBy: companyId } } }),
      prisma.hrmPromotion.count({ where: { employee: { createdBy: companyId } } }),
      prisma.hrmTermination.count({ where: { employee: { createdBy: companyId } } }),
      prisma.hrmEmployee.groupBy({ by: ["departmentId"], where: { createdBy: companyId, status: "active", departmentId: { not: null } }, _count: { id: true } }),
      // Employees on leave today (approved)
      prisma.hrmLeaveApplication.findMany({
        where: { status: "approved", startDate: { lte: todayEnd }, endDate: { gte: todayStart }, employee: { createdBy: companyId } },
        include: { employee: { select: { firstName: true, lastName: true, employeeId: true, profilePhoto: true } }, leaveType: { select: { name: true } } },
        take: 20,
      }),
      // Recent leave applications
      prisma.hrmLeaveApplication.findMany({
        where: { employee: { createdBy: companyId } },
        include: { employee: { select: { firstName: true, lastName: true } }, leaveType: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      // Today's attendance employee IDs
      prisma.hrmAttendance.findMany({
        where: { date: todayAttendanceDate, employee: { createdBy: companyId } },
        select: { employeeId: true },
      }),
      // Awards as announcements
      prisma.hrmAward.findMany({
        where: { employee: { createdBy: companyId } },
        include: { awardType: { select: { name: true } }, employee: { select: { firstName: true, lastName: true } } },
        orderBy: { date: "desc" },
        take: 6,
      }),
      // Holidays for calendar
      prisma.hrmHoliday.findMany({
        where: { createdBy: companyId, isActive: true, date: { gte: calStart, lte: calEnd } },
        orderBy: { date: "asc" },
      }),
      prisma.hrmAnnouncement.findMany({
        where: { createdBy: companyId, isActive: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

    // Department distribution
    const deptIds = deptDist.map((d) => d.departmentId!);
    const deptNames = deptIds.length > 0 ? await prisma.hrmDepartment.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true } }) : [];
    const deptNameMap: Record<string, string> = {};
    for (const d of deptNames) deptNameMap[d.id.toString()] = d.name;

    // Missing attendance: active employees not in today's attendance
    const presentIds = new Set(todayAttendanceIds.map((a) => a.employeeId.toString()));
    const missingEmployees = await prisma.hrmEmployee.findMany({
      where: { createdBy: companyId, status: "active", id: { notIn: todayAttendanceIds.map((a) => a.employeeId) } },
      select: { id: true, firstName: true, lastName: true, employeeId: true, profilePhoto: true, department: { select: { name: true } } },
      take: 20,
    });

    return jsonR({
      stats: {
        total_employees: totalEmployees,
        active_employees: activeEmployees,
        present_today: todayPresent,
        absent_today: Math.max(0, activeEmployees - todayPresent),
        absent_yesterday: 0,
        on_leave: pendingLeaves,
        pending_leaves: pendingLeaves,
        total_branches: branches,
        total_departments: departments,
        total_promotions: promotions,
        terminations,
        pending_resignations: pendingResignations,
        department_distribution: deptDist.map((d) => ({
          name: deptNameMap[d.departmentId!.toString()] ?? "Unknown",
          value: d._count.id,
        })),
        calendar_events: upcomingHolidays.map((h) => ({
          id: Number(h.id),
          title: h.name,
          startDate: h.date instanceof Date ? h.date.toISOString().split("T")[0] : String(h.date),
          endDate: h.date instanceof Date ? h.date.toISOString().split("T")[0] : String(h.date),
          time: "",
          description: h.description ?? "",
          type: "holiday",
          color: "#10b981",
        })),
        recent_leave_applications: recentLeaveRaw.map((la) => ({
          id: Number(la.id),
          employee_name: `${la.employee.firstName} ${la.employee.lastName ?? ""}`.trim(),
          leave_type: la.leaveType.name,
          start_date: la.startDate instanceof Date ? la.startDate.toISOString().split("T")[0] : String(la.startDate),
          end_date: la.endDate instanceof Date ? la.endDate.toISOString().split("T")[0] : String(la.endDate),
          total_days: Number(la.totalDays),
          status: la.status,
          created_at: la.createdAt.toISOString(),
        })),
        recent_announcements:
          recentAnnouncementRows.length > 0
            ? recentAnnouncementRows.map((a) => ({
                id: Number(a.id),
                title: a.title,
                description: a.body ?? "",
                created_at: a.createdAt.toISOString(),
              }))
            : recentAwards.map((a) => ({
                id: Number(a.id),
                title: a.awardName,
                description:
                  a.description ?? `${a.awardType.name} awarded to ${a.employee.firstName} ${a.employee.lastName ?? ""}`.trim(),
                created_at: a.date instanceof Date ? a.date.toISOString().split("T")[0] : String(a.date),
              })),
        employees_on_leave_today: onLeaveTodayRaw.map((la) => ({
          name: `${la.employee.firstName} ${la.employee.lastName ?? ""}`.trim(),
          leave_type: la.leaveType.name,
          days: Number(la.totalDays),
          employee_id: la.employee.employeeId ?? "",
          profile: la.employee.profilePhoto ?? "",
        })),
        employees_without_attendance: missingEmployees.map((e) => ({
          name: `${e.firstName} ${e.lastName ?? ""}`.trim(),
          department: e.department?.name ?? "",
          employee_id: e.employeeId ?? `#${e.id}`,
          profile: e.profilePhoto ?? "",
        })),
      },
    });
  } catch (err) {
    console.error("HRM dashboard error", err);
    return serverError();
  }
}
