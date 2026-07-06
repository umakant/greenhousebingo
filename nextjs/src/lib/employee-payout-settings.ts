export type RolePayDefaults = {
  per_day: string;
  half_day: string;
};

export type EmployeePayoutDefaults = {
  agent: RolePayDefaults;
  medic: RolePayDefaults;
  security: RolePayDefaults;
};

export const DEFAULT_EMPLOYEE_PAYOUT: EmployeePayoutDefaults = {
  agent: { per_day: "600", half_day: "300" },
  medic: { per_day: "800", half_day: "400" },
  security: { per_day: "500", half_day: "250" },
};

export type EmployeePayRateRow = {
  id: number;
  project_id: number;
  project_name: string;
  user_id: number;
  user_name: string;
  user_email: string;
  role: string | null;
  rate_type: string;
  pay_rate: string;
  half_day_rate: string | null;
  notes: string | null;
};

function normalizeRole(role: string | null | undefined): keyof EmployeePayoutDefaults {
  const r = (role ?? "agent").toLowerCase();
  if (r === "medic" || r === "security") return r;
  return "agent";
}

function normalizeMoney(value: unknown, fallback: string): string {
  if (value == null || value === "") return fallback;
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  if (Number.isNaN(n) || n < 0) return fallback;
  return n.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function parseEmployeePayoutDefaults(raw: string | null | undefined): EmployeePayoutDefaults {
  if (!raw?.trim()) return { ...DEFAULT_EMPLOYEE_PAYOUT };
  try {
    const parsed = JSON.parse(raw) as Partial<EmployeePayoutDefaults>;
    return {
      agent: {
        per_day: normalizeMoney(parsed.agent?.per_day, DEFAULT_EMPLOYEE_PAYOUT.agent.per_day),
        half_day: normalizeMoney(parsed.agent?.half_day, DEFAULT_EMPLOYEE_PAYOUT.agent.half_day),
      },
      medic: {
        per_day: normalizeMoney(parsed.medic?.per_day, DEFAULT_EMPLOYEE_PAYOUT.medic.per_day),
        half_day: normalizeMoney(parsed.medic?.half_day, DEFAULT_EMPLOYEE_PAYOUT.medic.half_day),
      },
      security: {
        per_day: normalizeMoney(parsed.security?.per_day, DEFAULT_EMPLOYEE_PAYOUT.security.per_day),
        half_day: normalizeMoney(parsed.security?.half_day, DEFAULT_EMPLOYEE_PAYOUT.security.half_day),
      },
    };
  } catch {
    return { ...DEFAULT_EMPLOYEE_PAYOUT };
  }
}

export function serializeEmployeePayoutDefaults(defaults: EmployeePayoutDefaults): string {
  return JSON.stringify(defaults);
}

export function resolveRolePayDefaults(
  defaults: EmployeePayoutDefaults,
  role: string | null | undefined,
): RolePayDefaults {
  return defaults[normalizeRole(role)];
}

export function resolveEmployeePayRates(opts: {
  defaults: EmployeePayoutDefaults;
  role: string | null | undefined;
  override?: { pay_rate: number | string; half_day_rate?: number | string | null } | null;
}): { per_day: string; half_day: string } {
  const roleDefaults = resolveRolePayDefaults(opts.defaults, opts.role);
  if (!opts.override) return roleDefaults;
  const perDay = normalizeMoney(opts.override.pay_rate, roleDefaults.per_day);
  const halfDay = opts.override.half_day_rate != null && opts.override.half_day_rate !== ""
    ? normalizeMoney(opts.override.half_day_rate, roleDefaults.half_day)
    : normalizeMoney(Number(perDay) / 2, roleDefaults.half_day);
  return { per_day: perDay, half_day: halfDay };
}

export function formatPayRateLabel(perDay: string, halfDay: string): string {
  return `$${perDay} per day / $${halfDay} half day`;
}
