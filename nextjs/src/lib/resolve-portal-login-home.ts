import { CUSTOMER_EXPENSE_PERMISSION_NAMES } from "@/lib/account-customer-role";
import { EMPLOYEE_EXPENSE_PERMISSION_NAMES } from "@/lib/hrm-employee-role";
import { VENDOR_EXPENSE_PERMISSION_NAMES } from "@/lib/account-vendor-role";

export function resolvePortalLoginHome(
  userType: string | null | undefined,
  activatedPackages: string[],
  permissions: string[],
): string {
  const type = (userType ?? "").trim().toLowerCase();
  const hasExpenseAddon = activatedPackages.some((p) => p.toLowerCase() === "expensemanagement");
  if (!hasExpenseAddon) return "/launchpad";

  const expensePerms =
    type === "staff"
      ? EMPLOYEE_EXPENSE_PERMISSION_NAMES
      : type === "client"
        ? CUSTOMER_EXPENSE_PERMISSION_NAMES
        : type === "vendor"
          ? VENDOR_EXPENSE_PERMISSION_NAMES
          : [];

  const canUseExpense =
    permissions.includes("*") || expensePerms.some((p) => permissions.includes(p));

  return canUseExpense ? "/expense-management" : "/launchpad";
}

/** Post-impersonation landing for LMS learner / instructor portal users. */
export function resolveLmsImpersonationHome(
  lmsPortal: "student" | "instructor",
  permissions: string[],
): string {
  if (lmsPortal === "instructor") {
    if (
      permissions.includes("*") ||
      permissions.includes("manage-lms-instructor-dashboard") ||
      permissions.includes("manage-lms-instructor-courses") ||
      permissions.includes("manage-lms-instructor-profile")
    ) {
      return "/lms/instructor";
    }
    return "/lms/dashboard";
  }
  if (
    permissions.includes("*") ||
    permissions.includes("manage-lms-student-dashboard") ||
    permissions.some((p) => p.startsWith("manage-lms") && p.includes("student"))
  ) {
    return "/lms/student/dashboard";
  }
  return "/lms/my-learning";
}
