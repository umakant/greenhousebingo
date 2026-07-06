import { prisma } from "@/lib/prisma";
import { resolvePayRatesForStaff } from "@/lib/employee-payout-server";
import { eachDateInRange } from "@/lib/project-staff-hours";
import {
  buildDefaultSowContent,
  mergeSowWithDefaults,
  serializeSowRow,
  type SowRecord,
} from "@/lib/project-sow";
import {
  applyPayRatesToSowForm,
  buildDefaultSowFormData,
  mergeSowFormData,
  parseFormDataJson,
  sowRecordToFormHints,
  type SowFormData,
} from "@/lib/project-sow-form";
import { loadSowProjectContext, loadStaffByUser } from "@/lib/project-sow-server";

export function countAssignmentDays(
  assignments: { work_date: string | null; end_date: string | null }[],
): number {
  return assignments.reduce((sum, a) => {
    if (!a.work_date) return sum;
    return sum + eachDateInRange(a.work_date, a.end_date ?? a.work_date).length;
  }, 0);
}

export async function loadSowFormForEmployee(opts: {
  projectId: bigint;
  userId: bigint;
  companyId: bigint;
}): Promise<
  | {
      staff: {
        name: string;
        email: string;
        roles: Set<string>;
        assignments: import("@/lib/project-sow").SowStaffAssignment[];
      };
      projectCtx: NonNullable<Awaited<ReturnType<typeof loadSowProjectContext>>>;
      sow: SowRecord;
      form: SowFormData;
      row: Awaited<ReturnType<typeof prisma.projectStaffSow.findUnique>>;
    }
  | { error: string; status: number }
> {
  const staffMap = await loadStaffByUser(opts.projectId);
  const staff = staffMap.get(opts.userId);
  if (!staff) return { error: "Employee not assigned to this project", status: 404 };

  const projectCtx = await loadSowProjectContext(opts.projectId);
  if (!projectCtx) return { error: "Not found", status: 404 };

  const defaults = buildDefaultSowContent(projectCtx, staff.name, staff.assignments);
  const formDefaults = buildDefaultSowFormData(
    projectCtx,
    { name: staff.name, email: staff.email },
    staff.assignments,
  );
  const row = await prisma.projectStaffSow.findUnique({
    where: { projectId_userId: { projectId: opts.projectId, userId: opts.userId } },
  });

  const sow = mergeSowWithDefaults(row ? serializeSowRow(row) : null, defaults);
  const storedForm = parseFormDataJson(row?.formData);
  let form = sowRecordToFormHints(sow, mergeSowFormData(storedForm, formDefaults));

  const totalDays = countAssignmentDays(staff.assignments);
  try {
    const payRates = await resolvePayRatesForStaff({
      companyId: opts.companyId,
      projectId: opts.projectId,
      userId: opts.userId,
      role: [...staff.roles][0] ?? "agent",
    });
    form = applyPayRatesToSowForm(form, payRates, totalDays);
  } catch {
    // table may not exist until migration
  }

  return { staff, projectCtx, sow, form, row };
}
