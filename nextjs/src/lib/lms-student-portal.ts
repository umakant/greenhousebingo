import type { LmsPageUser } from "@/lib/require-lms-page";

export function isLmsStudentPortalUser(user: Pick<LmsPageUser, "primaryRole" | "roles">): boolean {
  if (user.primaryRole === "lms-student") return true;
  return user.roles.some((r) => r === "lms-student");
}

export type LmsStudentPortalSession = {
  name: string;
  email: string;
};
