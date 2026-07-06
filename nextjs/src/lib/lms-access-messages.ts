/** Client-safe access denial copy (mirrors `lms-course-access` codes). */
export function lmsAccessDenialMessage(code: string | undefined): string {
  switch (code) {
    case "not_enrolled":
      return "You need an active enrollment to view this course. Enroll from My learning when the course is available.";
    case "private_not_enrolled":
      return "This is a private course. You must be enrolled by an administrator before you can access the content.";
    case "access_not_started":
      return "Your access to this course has not started yet. Check back after the access start date.";
    case "access_expired":
      return "Your access to this course has ended.";
    case "purchase_invalid":
      return "Your enrollment is linked to a storefront order that is no longer paid. Contact support to restore access.";
    case "capacity_exceeded":
      return "This course is over capacity and your seat is not active. Contact your administrator.";
    case "course_not_available":
      return "This course is not published for learners yet.";
    default:
      return "You do not have access to this course content.";
  }
}

export function lmsAccessDenialCta(code: string | undefined): { label: string; href: string } {
  if (code === "not_enrolled") {
    return { label: "Browse courses", href: "/lms/my-learning" };
  }
  return { label: "Back to My learning", href: "/lms/my-learning" };
}
