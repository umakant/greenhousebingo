import { redirect } from "next/navigation";

import { requireLmsPageAccess } from "@/lib/require-lms-page";

type LmsEditCoursePageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function LmsEditCoursePage(props: LmsEditCoursePageProps) {
  await requireLmsPageAccess("/lms/courses/edit", "manage-lms-courses");
  const { courseId } = await props.params;
  redirect(`/lms/courses?edit=${encodeURIComponent(courseId)}`);
}
