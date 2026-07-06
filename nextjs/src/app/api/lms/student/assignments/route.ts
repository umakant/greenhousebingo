import { NextRequest, NextResponse } from "next/server";

import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";

export const dynamic = "force-dynamic";

export type LmsStudentAssignmentStatus =
  | "NOT_SUBMITTED"
  | "PENDING_REVIEW"
  | "PASSED"
  | "FAILED";

/** Student assignment list — returns empty until LMS assignment models are added. */
export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get("search")?.trim().toLowerCase() ?? "";
  const status = req.nextUrl.searchParams.get("status")?.trim().toUpperCase() ?? "ALL";
  const courseId = req.nextUrl.searchParams.get("courseId");

  // Placeholder: no assignment submissions table yet.
  const items: Array<{
    id: string;
    title: string;
    courseId: string;
    courseTitle: string;
    courseType: string;
    instructorName: string | null;
    deadline: string | null;
    firstSubmissionAt: string | null;
    lastSubmissionAt: string | null;
    attemptsUsed: number;
    attemptsAllowed: number;
    grade: number | null;
    passingGrade: number;
    status: LmsStudentAssignmentStatus;
  }> = [];

  let filtered = items;
  if (courseId && courseId !== "all") {
    filtered = filtered.filter((i) => i.courseId === courseId);
  }
  if (status !== "ALL") {
    filtered = filtered.filter((i) => i.status === status);
  }
  if (search) {
    filtered = filtered.filter(
      (i) =>
        i.title.toLowerCase().includes(search) ||
        i.courseTitle.toLowerCase().includes(search),
    );
  }

  const summary = {
    courseAssignments: filtered.length,
    pendingReview: filtered.filter((i) => i.status === "PENDING_REVIEW").length,
    passed: filtered.filter((i) => i.status === "PASSED").length,
    failed: filtered.filter((i) => i.status === "FAILED").length,
  };

  return NextResponse.json({ ok: true, summary, items: filtered });
}
