import { redirect } from "next/navigation";

import { requireLmsPageAccess } from "@/lib/require-lms-page";

export default async function LmsNewCoursePage() {
  await requireLmsPageAccess("/lms/courses/new", "manage-lms-courses");
  redirect("/lms/courses?action=new");
}
