/** LMS menu permissions reserved for employee / student portal users. */
export const LMS_EMPLOYEE_LEARNER_MENU_PERMISSIONS = [
  "view-lms-student-dashboard",
  "manage-lms-student-dashboard",
] as const;

export function isLmsEmployeeLearnerMenuPermission(permission?: string): boolean {
  return Boolean(
    permission &&
      (LMS_EMPLOYEE_LEARNER_MENU_PERMISSIONS as readonly string[]).includes(permission),
  );
}

/**
 * HRM staff and LMS student portal users — not company tenant admins.
 * Company admins may inherit student LMS permissions from the plan; they must not see learner UI.
 */
export function isLmsEmployeeLearnerAudience(roles: string[], primaryRole?: string): boolean {
  const normalized = roles.map((r) => r.trim().toLowerCase());
  const primary = (primaryRole ?? roles[0] ?? "").trim().toLowerCase();
  if (primary === "lms-student" || primary === "staff") return true;
  return normalized.includes("staff");
}
