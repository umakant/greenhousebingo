import { cookies } from "next/headers";

import Link from "next/link";

import { LmsAuthenticatedShell } from "@/components/lms/lms-authenticated-shell";
import { Button } from "@/components/ui/button";
import { loadTenantActorUser, resolveTenantOrganizationId } from "@/lib/lms-organization";
import { requireLmsPageAccess } from "@/lib/require-lms-page";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/admin-t";


export default async function LmsInstructorCoursesPage() {
  const user = await requireLmsPageAccess("/lms/instructor/courses", "view-lms-instructor-assignments");

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
          include: {
            course: { select: { id: true, title: true, slug: true, status: true, deliveryType: true } },
          },
          orderBy: { id: "asc" },
          take: 100,
        })
      : [];

  return (
    <LmsAuthenticatedShell
      user={user}
      pageTitle={t("My courses")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Instructor home"), url: "/lms/instructor" },
        { label: t("My courses") },
      ]}
    >
      <div className="rounded-lg border border-border/80 bg-card">
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold">{t("Assigned courses")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Courses where you are linked as an instructor. Admins assign instructors from each course roster.")}
          </p>
        </div>
        <ul className="divide-y divide-border/60">
          {assignments.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("No course assignments yet.")}
            </li>
          ) : (
            assignments.map((a) => (
              <li key={a.id.toString()} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{a.course.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.course.slug} · {String(a.course.status)} · {String(a.course.deliveryType)}
                    {a.isPrimary ? ` · ${t("Primary")}` : ""}
                    {a.role ? ` · ${a.role}` : ""}
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/lms/instructor/course-support?courseId=${a.course.id.toString()}`}>
                    {t("Learner questions")}
                  </Link>
                </Button>
              </li>
            ))
          )}
        </ul>
      </div>
    </LmsAuthenticatedShell>
  );
}
