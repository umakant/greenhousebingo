import { cookies } from "next/headers";

import { LmsAuthenticatedShell } from "@/components/lms/lms-authenticated-shell";
import { LmsInstructorCourseSupportClient } from "@/components/lms/lms-instructor-course-support-client";
import { loadTenantActorUser, resolveTenantOrganizationId } from "@/lib/lms-organization";
import { requireLmsPageAccess } from "@/lib/require-lms-page";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/admin-t";


export default async function LmsInstructorCourseSupportPage(props: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const user = await requireLmsPageAccess("/lms/instructor/course-support", "view-lms-instructor-assignments");
  const sp = await props.searchParams;
  const initialCourseId = typeof sp.courseId === "string" ? sp.courseId.trim() : null;

  const store = await cookies();
  const uidRaw = store.get("pf_user_id")?.value?.trim();
  let userId: bigint | null = null;
  if (uidRaw) {
    try {
      userId = BigInt(uidRaw);
    } catch {
      userId = null;
    }
  }

  const actorUser = userId != null ? await loadTenantActorUser(userId) : null;
  const orgId = actorUser ? resolveTenantOrganizationId(actorUser) : null;

  const assignments =
    userId != null && orgId != null
      ? await prisma.courseInstructor.findMany({
          where: {
            organizationId: orgId,
            instructorProfile: { userId },
          },
          include: { course: { select: { id: true, title: true } } },
          orderBy: { id: "asc" },
        })
      : [];

  const courses = assignments.map((a) => ({
    id: a.course.id.toString(),
    title: a.course.title,
  }));

  return (
    <LmsAuthenticatedShell
      user={user}
      pageTitle={t("Course support")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Instructor home"), url: "/lms/instructor" },
        { label: t("Learner questions") },
      ]}
    >
      <LmsInstructorCourseSupportClient courses={courses} initialCourseId={initialCourseId} />
    </LmsAuthenticatedShell>
  );
}
