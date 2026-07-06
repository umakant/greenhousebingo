import { cookies } from "next/headers";

import { LmsAuthenticatedShell } from "@/components/lms/lms-authenticated-shell";
import { LmsCourseNotFound } from "@/components/lms/lms-course-not-found";
import { LmsLearnerContent } from "@/components/lms/lms-learner-experience";
import { LmsMyLearningCourseClient } from "@/components/lms/lms-my-learning-course-client";
import { loadTenantActorUser, resolveTenantOrganizationId } from "@/lib/lms-organization";
import { resolveLmsCourseRef, resolveLmsCourseRefGlobal } from "@/lib/lms-course-ref";
import { requireLmsEmployeeLearnerPage } from "@/lib/require-lms-page";
import { t } from "@/lib/admin-t";


export default async function LmsMyLearningCoursePage(props: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const user = await requireLmsEmployeeLearnerPage("/lms/my-learning/course");
  const { courseId: rawRef } = await props.params;
  const sp = await props.searchParams;
  const lessonRaw = typeof sp.lesson === "string" ? sp.lesson.trim() : "";
  const initialLessonId = /^\d+$/.test(lessonRaw) ? lessonRaw : null;

  const store = await cookies();
  const uidRaw = store.get("pf_user_id")?.value?.trim();
  let organizationId: bigint | null = null;
  if (uidRaw) {
    try {
      const actor = await loadTenantActorUser(BigInt(uidRaw));
      organizationId = actor ? resolveTenantOrganizationId(actor) : null;
    } catch {
      organizationId = null;
    }
  }

  const course =
    organizationId != null
      ? await resolveLmsCourseRef(rawRef, organizationId)
      : await resolveLmsCourseRefGlobal(rawRef);

  if (!course) {
    return (
      <LmsAuthenticatedShell
        user={user}
        pageTitle={t("Course not found")}
        breadcrumbs={[
          { label: t("LMS"), url: "/lms/dashboard" },
          { label: t("My learning"), url: "/lms/my-learning" },
          { label: t("Not found") },
        ]}
      >
        <LmsLearnerContent>
          <LmsCourseNotFound courseRef={rawRef} />
        </LmsLearnerContent>
      </LmsAuthenticatedShell>
    );
  }

  const courseId = course.id.toString();

  return (
    <LmsAuthenticatedShell
      user={user}
      pageTitle=""
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("My learning"), url: "/lms/my-learning" },
        { label: course.title.slice(0, 48) },
      ]}
    >
      <LmsLearnerContent>
        <LmsMyLearningCourseClient courseId={courseId} title={course.title} initialLessonId={initialLessonId} />
      </LmsLearnerContent>
    </LmsAuthenticatedShell>
  );
}
