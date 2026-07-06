import "server-only";

import { LmsEnrollmentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function startOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** Last 12 calendar months including current, as YYYY-MM. */
export function last12MonthKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function fillMonthlySeries(
  keys: string[],
  rows: { month: string; value: number }[],
): { month: string; value: number }[] {
  const map = new Map(rows.map((r) => [r.month, r.value]));
  return keys.map((month) => ({ month, value: map.get(month) ?? 0 }));
}

export type LmsAnalyticsSummary = {
  overview: {
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    completionRate: number;
    activeStudents: number;
    studentsEngagedLast30Days: number;
    totalRevenue: number;
    revenueRecordCount: number;
    enrollmentsByStatus: { status: string; count: number }[];
  };
  trends: {
    enrollmentsByMonth: { month: string; enrollments: number }[];
    revenueByMonth: { month: string; revenue: number }[];
  };
  coursePerformance: {
    courseId: string;
    title: string;
    status: string;
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    completionRate: number;
    avgProgressPercent: number;
    grossRevenue: number;
  }[];
};

export async function getLmsAnalyticsSummary(organizationId: bigint): Promise<LmsAnalyticsSummary> {
  const monthKeys = last12MonthKeys();
  const since12m = startOfMonthUtc(new Date(Date.UTC(
    Number(monthKeys[0].slice(0, 4)),
    Number(monthKeys[0].slice(5, 7)) - 1,
    1,
  )));
  const since30d = new Date();
  since30d.setDate(since30d.getDate() - 30);

  const [
    enrollmentByStatus,
    revenueAgg,
    activeStudentsGroup,
    engagedStudentsRow,
    monthlyEnrollmentsRaw,
    monthlyRevenueRaw,
    revenueByCourse,
    coursePerformanceRaw,
  ] = await Promise.all([
    prisma.enrollment.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: true,
    }),
    prisma.lmsCourseRevenueRecord.aggregate({
      where: { organizationId },
      _sum: { grossAmount: true },
      _count: true,
    }),
    prisma.enrollment.groupBy({
      by: ["studentUserId"],
      where: { organizationId, status: LmsEnrollmentStatus.ACTIVE },
    }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT e.student_user_id)::bigint AS count
      FROM lms_lesson_progress lp
      INNER JOIN lms_enrollments e ON e.id = lp.enrollment_id
      WHERE lp.organization_id = ${organizationId}
        AND lp.last_engaged_at >= ${since30d}
    `,
    prisma.$queryRaw<{ month: string; enrollments: number }[]>`
      SELECT to_char(date_trunc('month', enrolled_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
             COUNT(*)::int AS enrollments
      FROM lms_enrollments
      WHERE organization_id = ${organizationId}
        AND enrolled_at >= ${since12m}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.$queryRaw<{ month: string; revenue: number }[]>`
      SELECT to_char(date_trunc('month', recorded_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
             COALESCE(SUM(gross_amount), 0)::float AS revenue
      FROM lms_course_revenue_records
      WHERE organization_id = ${organizationId}
        AND recorded_at >= ${since12m}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.lmsCourseRevenueRecord.groupBy({
      by: ["courseId"],
      where: { organizationId },
      _sum: { grossAmount: true },
    }),
    prisma.$queryRaw<
      {
        course_id: bigint;
        title: string;
        status: string;
        total_enrollments: number;
        active_enrollments: number;
        completed_enrollments: number;
        avg_progress_percent: number | null;
      }[]
    >`
      WITH published AS (
        SELECT course_id, COUNT(*)::int AS lesson_count
        FROM lms_course_lessons
        WHERE organization_id = ${organizationId} AND is_published = true
        GROUP BY course_id
      ),
      enrollment_progress AS (
        SELECT
          e.course_id,
          e.id AS enrollment_id,
          e.status,
          COALESCE(p.lesson_count, 0) AS lesson_count,
          COUNT(lp.id) FILTER (WHERE lp.completed_at IS NOT NULL)::int AS completed_lessons
        FROM lms_enrollments e
        LEFT JOIN published p ON p.course_id = e.course_id
        LEFT JOIN lms_lesson_progress lp ON lp.enrollment_id = e.id
        WHERE e.organization_id = ${organizationId}
          AND e.status IN ('ACTIVE', 'COMPLETED')
        GROUP BY e.course_id, e.id, e.status, p.lesson_count
      ),
      stats AS (
        SELECT
          course_id,
          COUNT(*)::int AS total_enrollments,
          COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active_enrollments,
          COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed_enrollments,
          ROUND(AVG(
            CASE
              WHEN lesson_count > 0
              THEN LEAST(100, (completed_lessons::numeric / lesson_count) * 100)
              ELSE 0
            END
          )::numeric, 1)::float AS avg_progress_percent
        FROM enrollment_progress
        GROUP BY course_id
      )
      SELECT
        c.id AS course_id,
        c.title,
        c.status::text AS status,
        COALESCE(s.total_enrollments, 0)::int AS total_enrollments,
        COALESCE(s.active_enrollments, 0)::int AS active_enrollments,
        COALESCE(s.completed_enrollments, 0)::int AS completed_enrollments,
        s.avg_progress_percent
      FROM lms_courses c
      LEFT JOIN stats s ON s.course_id = c.id
      WHERE c.organization_id = ${organizationId}
      ORDER BY COALESCE(s.total_enrollments, 0) DESC, c.title ASC
      LIMIT 100
    `,
  ]);

  const statusCounts = new Map(enrollmentByStatus.map((r) => [r.status, r._count]));
  const totalEnrollments = enrollmentByStatus.reduce((n, r) => n + r._count, 0);
  const activeEnrollments = statusCounts.get(LmsEnrollmentStatus.ACTIVE) ?? 0;
  const completedEnrollments = statusCounts.get(LmsEnrollmentStatus.COMPLETED) ?? 0;
  const completionDenominator = activeEnrollments + completedEnrollments;
  const completionRate =
    completionDenominator > 0
      ? Math.round((completedEnrollments / completionDenominator) * 1000) / 10
      : 0;

  const revenueMap = new Map(
    revenueByCourse.map((r) => [r.courseId.toString(), Number(r._sum.grossAmount ?? 0)]),
  );

  const enrollmentsByMonth = fillMonthlySeries(
    monthKeys,
    monthlyEnrollmentsRaw.map((r) => ({ month: r.month, value: r.enrollments })),
  ).map((r) => ({ month: r.month, enrollments: r.value }));

  const revenueByMonth = fillMonthlySeries(
    monthKeys,
    monthlyRevenueRaw.map((r) => ({ month: r.month, value: r.revenue })),
  ).map((r) => ({ month: r.month, revenue: r.value }));

  const coursePerformance = coursePerformanceRaw.map((row) => {
    const total = row.total_enrollments;
    const completed = row.completed_enrollments;
    const rate = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;
    return {
      courseId: row.course_id.toString(),
      title: row.title,
      status: row.status,
      totalEnrollments: total,
      activeEnrollments: row.active_enrollments,
      completedEnrollments: completed,
      completionRate: rate,
      avgProgressPercent: row.avg_progress_percent ?? 0,
      grossRevenue: revenueMap.get(row.course_id.toString()) ?? 0,
    };
  });

  return {
    overview: {
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      completionRate,
      activeStudents: activeStudentsGroup.length,
      studentsEngagedLast30Days: Number(engagedStudentsRow[0]?.count ?? 0),
      totalRevenue: Number(revenueAgg._sum.grossAmount ?? 0),
      revenueRecordCount: revenueAgg._count,
      enrollmentsByStatus: enrollmentByStatus.map((r) => ({
        status: r.status,
        count: r._count,
      })),
    },
    trends: {
      enrollmentsByMonth,
      revenueByMonth,
    },
    coursePerformance,
  };
}

export type LmsDashboardData = {
  stats: {
    total_courses: number;
    published_courses: number;
    total_enrollments: number;
    active_enrollments: number;
    completed_enrollments: number;
    completion_rate: number;
    active_students: number;
    engaged_students_30d: number;
    total_revenue: number;
    total_instructors: number;
  };
  monthlyProgress: { month: string; created: number; completed: number }[];
  yearlyProgress: { year: string; created: number; completed: number }[];
  courseStatus: { name: string; value: number; color: string }[];
  enrollmentStatus: { name: string; value: number; color: string }[];
  coursePerformance: {
    name: string;
    total_enrollments: number;
    completed_enrollments: number;
    completion_rate: number;
  }[];
  recentCourses: {
    id: string;
    title: string;
    status: string;
    delivery_type: string;
    enrollment_count: number;
    is_public: boolean;
  }[];
};

function buildLast6MonthLabels(now: Date): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ key, label: d.toLocaleDateString("en-US", { month: "short" }) });
  }
  return out;
}

function buildLast6Years(now: Date): string[] {
  const years: string[] = [];
  const cy = now.getFullYear();
  for (let i = 5; i >= 0; i--) years.push(String(cy - i));
  return years;
}

const ENROLLMENT_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#3b82f6",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
  SUSPENDED: "#f59e0b",
};

const COURSE_STATUS_COLORS: Record<string, string> = {
  PUBLISHED: "#10b981",
  DRAFT: "#f59e0b",
  ARCHIVED: "#6b7280",
  SCHEDULED: "#3b82f6",
};

function formatEnrollmentStatusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatCourseStatusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export async function getLmsDashboardData(organizationId: bigint): Promise<LmsDashboardData> {
  const now = new Date();
  const monthLabels = buildLast6MonthLabels(now);
  const since6m = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const since30d = new Date();
  since30d.setDate(since30d.getDate() - 30);
  const yearKeys = buildLast6Years(now);
  const since6y = new Date(now.getFullYear() - 5, 0, 1);

  const summary = await getLmsAnalyticsSummary(organizationId);

  const [
    coursesByStatus,
    instructorCount,
    monthlyCompletionsRaw,
    yearlyEnrollmentsRaw,
    yearlyCompletionsRaw,
    recentCoursesRaw,
  ] = await Promise.all([
    prisma.course.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: true,
    }),
    prisma.instructorProfile.count({ where: { organizationId, isActive: true } }),
    prisma.$queryRaw<{ month: string; completions: number }[]>`
      SELECT to_char(date_trunc('month', completed_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
             COUNT(*)::int AS completions
      FROM lms_enrollments
      WHERE organization_id = ${organizationId}
        AND completed_at IS NOT NULL
        AND completed_at >= ${since6m}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.$queryRaw<{ year: string; enrollments: number }[]>`
      SELECT to_char(date_trunc('year', enrolled_at AT TIME ZONE 'UTC'), 'YYYY') AS year,
             COUNT(*)::int AS enrollments
      FROM lms_enrollments
      WHERE organization_id = ${organizationId}
        AND enrolled_at >= ${since6y}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.$queryRaw<{ year: string; completions: number }[]>`
      SELECT to_char(date_trunc('year', completed_at AT TIME ZONE 'UTC'), 'YYYY') AS year,
             COUNT(*)::int AS completions
      FROM lms_enrollments
      WHERE organization_id = ${organizationId}
        AND completed_at IS NOT NULL
        AND completed_at >= ${since6y}
      GROUP BY 1
      ORDER BY 1
    `,
    prisma.course.findMany({
      where: { organizationId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        deliveryType: true,
        isPublic: true,
        _count: { select: { enrollments: true } },
      },
    }),
  ]);

  const enrollments6mMap = new Map<string, number>();
  for (const row of summary.trends.enrollmentsByMonth) {
    enrollments6mMap.set(row.month, row.enrollments);
  }
  const completions6mMap = new Map(monthlyCompletionsRaw.map((r) => [r.month, r.completions]));

  const monthlyProgress = monthLabels.map(({ key, label }) => ({
    month: label,
    created: enrollments6mMap.get(key) ?? 0,
    completed: completions6mMap.get(key) ?? 0,
  }));

  const yearlyEnrollMap = new Map(yearlyEnrollmentsRaw.map((r) => [r.year, r.enrollments]));
  const yearlyCompleteMap = new Map(yearlyCompletionsRaw.map((r) => [r.year, r.completions]));
  const yearlyProgress = yearKeys.map((year) => ({
    year,
    created: yearlyEnrollMap.get(year) ?? 0,
    completed: yearlyCompleteMap.get(year) ?? 0,
  }));

  const courseStatus = coursesByStatus.map((r) => ({
    name: formatCourseStatusLabel(r.status),
    value: r._count,
    color: COURSE_STATUS_COLORS[r.status] ?? "#94a3b8",
  }));

  const enrollmentStatus = summary.overview.enrollmentsByStatus.map((r) => ({
    name: formatEnrollmentStatusLabel(r.status),
    value: r.count,
    color: ENROLLMENT_STATUS_COLORS[r.status] ?? "#94a3b8",
  }));

  const coursePerformance = summary.coursePerformance
    .filter((c) => c.totalEnrollments > 0)
    .slice(0, 5)
    .map((c) => ({
      name: c.title.length > 42 ? `${c.title.slice(0, 42)}…` : c.title,
      total_enrollments: c.totalEnrollments,
      completed_enrollments: c.completedEnrollments,
      completion_rate: c.completionRate,
    }));

  const publishedCourses = coursesByStatus.find((r) => r.status === "PUBLISHED")?._count ?? 0;
  const totalCourses = coursesByStatus.reduce((n, r) => n + r._count, 0);

  return {
    stats: {
      total_courses: totalCourses,
      published_courses: publishedCourses,
      total_enrollments: summary.overview.totalEnrollments,
      active_enrollments: summary.overview.activeEnrollments,
      completed_enrollments: summary.overview.completedEnrollments,
      completion_rate: Math.round(summary.overview.completionRate),
      active_students: summary.overview.activeStudents,
      engaged_students_30d: summary.overview.studentsEngagedLast30Days,
      total_revenue: summary.overview.totalRevenue,
      total_instructors: instructorCount,
    },
    monthlyProgress,
    yearlyProgress,
    courseStatus,
    enrollmentStatus,
    coursePerformance,
    recentCourses: recentCoursesRaw.map((c) => ({
      id: c.id.toString(),
      title: c.title,
      status: c.status,
      delivery_type: c.deliveryType,
      enrollment_count: c._count.enrollments,
      is_public: c.isPublic,
    })),
  };
}
