import { prisma } from "@/lib/prisma";
import {
  parseEmployeePayoutDefaults,
  resolveEmployeePayRates,
  type EmployeePayoutDefaults,
} from "@/lib/employee-payout-settings";
import { getSettingsForOwner } from "@/lib/settings-service";

export async function loadEmployeePayoutDefaults(companyId: bigint): Promise<EmployeePayoutDefaults> {
  const settings = await getSettingsForOwner(companyId);
  return parseEmployeePayoutDefaults(settings.employee_payout_defaults);
}

export async function loadProjectEmployeePayRate(projectId: bigint, userId: bigint) {
  return prisma.projectEmployeePayRate.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

export async function resolvePayRatesForStaff(opts: {
  companyId: bigint;
  projectId: bigint;
  userId: bigint;
  role: string | null | undefined;
}): Promise<{ per_day: string; half_day: string }> {
  const defaults = await loadEmployeePayoutDefaults(opts.companyId);
  const override = await loadProjectEmployeePayRate(opts.projectId, opts.userId);
  return resolveEmployeePayRates({
    defaults,
    role: override?.role ?? opts.role,
    override: override
      ? {
          pay_rate: Number(override.payRate),
          half_day_rate: override.halfDayRate != null ? Number(override.halfDayRate) : null,
        }
      : null,
  });
}
