import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, serverError } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-recruitment-dashboard")) return forbidden();

  try {
    const cid = getCompanyId(actor);

    // Calendar window: prev month .. next 2 months
    const now = new Date();
    const calStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
    const calEnd   = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString().split("T")[0];

    const [
      totalCandidates,
      activeJobs,
      scheduledInterviews,
      onboardedCount,
      candidatesByStatus,
      onboardingCounts,
      interviewEvents,
      hiringFunnelCandidates,
    ] = await Promise.all([
      prisma.recCandidate.count({ where: { createdBy: cid } }),
      prisma.recJobPosting.count({ where: { createdBy: cid, isPublished: true } }),
      prisma.recInterview.count({ where: { createdBy: cid, status: "0" } }),
      prisma.recCandidate.count({ where: { createdBy: cid, status: "4" } }),
      prisma.recCandidate.groupBy({ by: ["status"], where: { createdBy: cid }, _count: { id: true } }),
      prisma.recCandidateOnboarding.groupBy({ by: ["status"], where: { createdBy: cid }, _count: { id: true } }),
      prisma.recInterview.findMany({
        where: { createdBy: cid, scheduledDate: { gte: calStart, lte: calEnd } },
        include: { candidate: { select: { firstName: true, lastName: true } } },
        orderBy: { scheduledDate: "asc" },
      }),
      prisma.recCandidate.findMany({ where: { createdBy: cid }, select: { status: true } }),
    ]);

    const statusLabels: Record<string, string> = {
      "0": "Applied", "1": "Shortlisted", "2": "Interview", "3": "Offered", "4": "Hired", "5": "Rejected",
    };

    const candidateStatusMap = new Map<string, number>();
    for (const r of candidatesByStatus) candidateStatusMap.set(r.status, r._count.id);

    // Hiring funnel — cumulative pipeline stages
    const total = hiringFunnelCandidates.length;
    const statusNums = hiringFunnelCandidates.map((c) => Number(c.status));
    const funnelStages = [
      { label: "Applications", description: "Initial stage", count: total },
      { label: "Shortlisted", description: "After screening", count: statusNums.filter((s) => s >= 1).length },
      { label: "Interview", description: "Scheduled/completed interviews", count: statusNums.filter((s) => s >= 2).length },
      { label: "Offered", description: "Offer extended", count: statusNums.filter((s) => s >= 3).length },
      { label: "Hired", description: "Joined the company", count: statusNums.filter((s) => s === 4).length },
    ].map((stage) => ({ ...stage, percentage: total > 0 ? Math.round((stage.count / total) * 100) : 0 }));

    const INTERVIEW_COLORS: Record<string, string> = {
      "0": "#3b82f6",   // scheduled → blue
      "1": "#f59e0b",   // rescheduled → amber
      "2": "#10b981",   // completed → green
      "3": "#ef4444",   // cancelled → red
    };

    return jsonR({
      /** Used to build `/careers?company=` for the public job board */
      careerPortalCompanyId: cid.toString(),
      stats: {
        totalCandidates,
        activeJobs,
        scheduledInterviews,
        onboardedCount,
        pendingOnboarding:
          onboardingCounts.find((r) => r.status === "Pending")?._count.id ?? 0,
      },
      candidateStatus: [
        { key: "0", label: "Applied",     count: candidateStatusMap.get("0") ?? 0, color: "#ef4444" },
        { key: "1", label: "Shortlisted", count: candidateStatusMap.get("1") ?? 0, color: "#3b82f6" },
        { key: "2", label: "Interview",   count: candidateStatusMap.get("2") ?? 0, color: "#f59e0b" },
        { key: "3", label: "Offered",     count: candidateStatusMap.get("3") ?? 0, color: "#8b5cf6" },
        { key: "4", label: "Hired",       count: candidateStatusMap.get("4") ?? 0, color: "#10b981" },
        { key: "5", label: "Rejected",    count: candidateStatusMap.get("5") ?? 0, color: "#6b7280" },
      ].filter((s) => s.count > 0),
      onboardingProgress: [
        { label: "Pending",     count: onboardingCounts.find((r) => r.status === "Pending")   ?._count.id ?? 0, color: "#f59e0b" },
        { label: "In Progress", count: onboardingCounts.find((r) => r.status === "In Progress")?._count.id ?? 0, color: "#3b82f6" },
        { label: "Completed",   count: onboardingCounts.find((r) => r.status === "Completed") ?._count.id ?? 0, color: "#10b981" },
      ].filter((s) => s.count > 0),
      interviewCalendar: interviewEvents.map((iv) => ({
        id: Number(iv.id),
        title: iv.candidate ? `${iv.candidate.firstName} ${iv.candidate.lastName ?? ""}`.trim() : "Interview",
        date: iv.scheduledDate,
        time: iv.scheduledTime,
        color: INTERVIEW_COLORS[iv.status] ?? "#3b82f6",
        status: iv.status,
      })),
      hiringFunnel: funnelStages,
    });
  } catch (e: unknown) {
    console.error("[recruitment/dashboard]", e);
    return serverError();
  }
}
