import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { LmsAuthenticatedShell } from "@/components/lms/lms-authenticated-shell";
import { LmsCourseOverviewClient } from "@/components/lms/lms-course-overview-client";
import { LmsLearnerContent, LmsLearnerExperienceProvider } from "@/components/lms/lms-learner-experience";
import { LEARNER_ENROLLMENT_STATUSES, LEARNER_VISIBLE_STATUS } from "@/lib/lms-course-access";
import { loadTenantActorUser, resolveTenantOrganizationId } from "@/lib/lms-organization";
import { requireLmsLearnerCatalogPage } from "@/lib/require-lms-page";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/admin-t";


function parseId(raw: string): bigint | null {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export default async function LmsCourseOverviewPage(props: { params: Promise<{ courseId: string }> }) {
  const user = await requireLmsLearnerCatalogPage("/lms/courses/overview");
  const { courseId: raw } = await props.params;
  const courseId = parseId(raw);
  if (courseId == null) notFound();

  const store = await cookies();
  const uidRaw = store.get("pf_user_id")?.value?.trim();
  let organizationId: bigint | null = null;
  let studentUserId: bigint | null = null;
  if (uidRaw) {
    try {
      const actor = await loadTenantActorUser(BigInt(uidRaw));
      organizationId = actor ? resolveTenantOrganizationId(actor) : null;
      studentUserId = actor?.id ?? null;
    } catch {
      organizationId = null;
    }
  }
  if (organizationId == null || studentUserId == null) notFound();

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      organizationId,
      status: { in: LEARNER_VISIBLE_STATUS },
      OR: [
        { isPublic: true },
        {
          enrollments: {
            some: { studentUserId, status: { in: LEARNER_ENROLLMENT_STATUSES } },
          },
        },
      ],
    },
    select: {
      title: true,
      slug: true,
      description: true,
      videoEmbedUrl: true,
      pdfDocumentUrl: true,
      enrollments: {
        where: { studentUserId, status: { in: LEARNER_ENROLLMENT_STATUSES } },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!course) notFound();

  return (
    <LmsAuthenticatedShell
      user={user}
      pageTitle={t("Course")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("My learning"), url: "/lms/my-learning" },
        { label: course.title.slice(0, 48) },
      ]}
    >
      <LmsLearnerExperienceProvider>
        <LmsLearnerContent>
          <LmsCourseOverviewClient
            courseId={raw}
            courseSlug={course.slug}
            title={course.title}
            description={course.description}
            videoEmbedUrl={course.videoEmbedUrl}
            pdfDocumentUrl={course.pdfDocumentUrl}
            isEnrolled={course.enrollments.length > 0}
          />
        </LmsLearnerContent>
      </LmsLearnerExperienceProvider>
    </LmsAuthenticatedShell>
  );
}
