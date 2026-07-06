import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { LmsAuthenticatedShell } from "@/components/lms/lms-authenticated-shell";
import { LmsCourseContentBuilder } from "@/components/lms/lms-course-content-builder";
import { Button } from "@/components/ui/button";
import { loadTenantActorUser, resolveTenantOrganizationId } from "@/lib/lms-organization";
import { prisma } from "@/lib/prisma";
import { requireLmsPageAccess } from "@/lib/require-lms-page";
import { t } from "@/lib/admin-t";


function parseId(raw: string): bigint | null {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export default async function LmsCourseContentPage(props: { params: Promise<{ courseId: string }> }) {
  const { courseId: raw } = await props.params;
  const user = await requireLmsPageAccess(`/lms/courses/${raw}/content`, "manage-lms-courses");
  const courseId = parseId(raw);
  if (courseId == null) notFound();

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
  if (organizationId == null) notFound();

  const course = await prisma.course.findFirst({
    where: { id: courseId, organizationId },
    select: { id: true, title: true },
  });
  if (!course) notFound();

  return (
    <LmsAuthenticatedShell
      user={user}
      pageTitle={t("Course content")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Courses"), url: "/lms/courses" },
        { label: course.title.slice(0, 40), url: `/lms/courses?edit=${raw}` },
        { label: t("Content") },
      ]}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/lms/courses?edit=${raw}`}>← {t("Course settings")}</Link>
        </Button>
      </div>
      <LmsCourseContentBuilder courseId={raw} />
    </LmsAuthenticatedShell>
  );
}
