import type { EmMatterNavId } from "@/components/expense-management/em-matter-workspace-shell";
import { getEmWorkflowCapabilities } from "@/lib/em-expense-workflow";

/** Matter workspace sections for portal employees (staff / self-service submitters). */
export const EM_EMPLOYEE_MATTER_NAV_IDS: EmMatterNavId[] = ["expenses", "receipts", "reports"];

export function isEmEmployeeMatterWorkspaceView(opts: {
  permissions: string[];
  roles?: string[];
  userType?: string | null;
}): boolean {
  return getEmWorkflowCapabilities({
    permissions: opts.permissions,
    roles: opts.roles ?? [],
    userType: opts.userType,
  }).isEmployeeSubmitter;
}

export function filterEmMatterNavIds(
  ids: EmMatterNavId[],
  opts: { permissions: string[]; roles?: string[]; userType?: string | null },
): EmMatterNavId[] {
  if (!isEmEmployeeMatterWorkspaceView(opts)) return ids;
  const allowed = new Set(EM_EMPLOYEE_MATTER_NAV_IDS);
  return ids.filter((id) => allowed.has(id));
}
