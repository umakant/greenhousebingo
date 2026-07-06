import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { getLmsDashboardData, type LmsDashboardData } from "@/lib/lms-analytics-service";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

function emptyDashboard(now: Date): LmsDashboardData {
  const months: { month: string; created: number; completed: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      created: 0,
      completed: 0,
    });
  }
  const years: { year: string; created: number; completed: number }[] = [];
  const cy = now.getFullYear();
  for (let i = 5; i >= 0; i--) {
    years.push({ year: String(cy - i), created: 0, completed: 0 });
  }
  return {
    stats: {
      total_courses: 0,
      published_courses: 0,
      total_enrollments: 0,
      active_enrollments: 0,
      completed_enrollments: 0,
      completion_rate: 0,
      active_students: 0,
      engaged_students_30d: 0,
      total_revenue: 0,
      total_instructors: 0,
    },
    monthlyProgress: months,
    yearlyProgress: years,
    courseStatus: [],
    enrollmentStatus: [],
    coursePerformance: [],
    recentCourses: [],
  };
}

export async function GET(req: NextRequest) {
  const now = new Date();
  try {
    const actor = await lmsTenantActorFromRequest(req);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const perms = await getPermissionsFromRequest(req);
    const canView =
      perms.includes("*") ||
      hasPermission(perms, "manage-lms-dashboard") ||
      hasPermission(perms, "manage-lms") ||
      hasPermission(perms, "manage-lms-analytics");

    if (!canView) {
      return NextResponse.json(emptyDashboard(now));
    }

    const data = await getLmsDashboardData(actor.organizationId);
    return NextResponse.json(data);
  } catch (e) {
    console.error("[lms/dashboard GET]", e);
    return NextResponse.json(emptyDashboard(now));
  }
}
