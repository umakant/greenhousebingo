import { LmsAuthenticatedShell } from "@/components/lms/lms-authenticated-shell";
import { LmsCoursesCatalogClient } from "@/components/lms/lms-courses-catalog-client";
import { requireLmsPageAccessAny, userMayAccessLmsPermission } from "@/lib/require-lms-page";
import { t } from "@/lib/admin-t";


type LmsCoursesPageProps = {
  searchParams: Promise<{ action?: string; edit?: string }>;
};

export default async function LmsCoursesPage(props: LmsCoursesPageProps) {
  const user = await requireLmsPageAccessAny("/lms/courses", [
    "manage-lms-courses",
    "manage-lms-instructor-courses",
    "view-lms-instructor-assignments",
    "manage-lms-instructor-dashboard",
  ]);

  const canManageCourses = userMayAccessLmsPermission(user.permissions, "manage-lms-courses");
  const sp = await props.searchParams;

  const initialSheet =
    canManageCourses && sp.action === "new"
      ? ({ mode: "create" } as const)
      : canManageCourses && sp.edit?.trim()
        ? ({ mode: "edit", courseId: sp.edit.trim() } as const)
        : null;

  return (
    <LmsAuthenticatedShell
      user={user}
      pageTitle={t("Courses")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Courses") },
      ]}
    >
      <LmsCoursesCatalogClient canManageCourses={canManageCourses} initialSheet={initialSheet} />
    </LmsAuthenticatedShell>
  );
}
