export type SowExpenseCategory = "parking" | "rideshare" | "airfare" | "lodging";

export type SowExpenseCoverage = "reimbursable" | "covered";

export type SowPerDiemRateRow = {
  id: string;
  category: string;
  rate_limit: string;
  frequency: string;
  applies_to: string;
  notes: string;
};

export type SowRecentExpense = {
  id: string;
  category: string;
  amount: string;
  status: "approved" | "covered" | "pending";
  date: string;
  employee: string;
};

export type SowPerDiemPolicy = {
  meals_provided_by_client: boolean;
  max_meal_reimbursement: string;
  general_notes: string;
  expenses: Record<SowExpenseCategory, { enabled: boolean; coverage: SowExpenseCoverage }>;
  rate_rows: SowPerDiemRateRow[];
  recent_expenses: SowRecentExpense[];
};

export const SOW_EXPENSE_LABELS: Record<SowExpenseCategory, { title: string; description: string }> = {
  parking: {
    title: "Parking",
    description: "Parking fees at venue or hotel",
  },
  rideshare: {
    title: "Rideshare / Taxi",
    description: "Transportation to and from venue",
  },
  airfare: {
    title: "Airfare",
    description: "Pre-purchased or reimbursed flights",
  },
  lodging: {
    title: "Lodging",
    description: "Hotel accommodations during activation",
  },
};

export function defaultPerDiemPolicy(): SowPerDiemPolicy {
  return {
    meals_provided_by_client: true,
    max_meal_reimbursement: "85.00",
    general_notes:
      "All expense reimbursements are subject to client approval. Receipts are required for all submissions. Reimbursement requests must be submitted within 30 days of expense occurrence.",
    expenses: {
      parking: { enabled: true, coverage: "reimbursable" },
      rideshare: { enabled: true, coverage: "reimbursable" },
      airfare: { enabled: true, coverage: "covered" },
      lodging: { enabled: true, coverage: "covered" },
    },
    rate_rows: [
      {
        id: "meal",
        category: "Meal Reimbursement",
        rate_limit: "$85.00",
        frequency: "Per Day",
        applies_to: "All Personnel",
        notes: "When meals not provided by client",
      },
      {
        id: "incidentals",
        category: "Incidentals",
        rate_limit: "Included",
        frequency: "Per Day",
        applies_to: "All Personnel",
        notes: "Included in daily meal limit",
      },
      {
        id: "mileage",
        category: "Mileage (if applicable)",
        rate_limit: "—",
        frequency: "Per Mile",
        applies_to: "All Personnel",
        notes: "Subject to client approval",
      },
    ],
    recent_expenses: [],
  };
}

export function mergePerDiemPolicy(
  stored: Partial<SowPerDiemPolicy> | null | undefined,
  defaults: SowPerDiemPolicy,
): SowPerDiemPolicy {
  if (!stored) return defaults;
  const expenses = { ...defaults.expenses };
  for (const key of Object.keys(expenses) as SowExpenseCategory[]) {
    if (stored.expenses?.[key]) {
      expenses[key] = { ...expenses[key], ...stored.expenses[key] };
    }
  }
  return {
    ...defaults,
    ...stored,
    expenses,
    rate_rows: stored.rate_rows?.length ? stored.rate_rows : defaults.rate_rows,
    recent_expenses: stored.recent_expenses ?? defaults.recent_expenses,
  };
}

export function buildPerDiemTextFromPolicy(policy: SowPerDiemPolicy, partnerName?: string | null): string {
  const partner = partnerName?.trim() || "On Location";
  const max = policy.max_meal_reimbursement?.trim() || "85";
  const maxDisplay = max.startsWith("$") ? max : `$${max}`;

  const mealLine = policy.meals_provided_by_client
    ? `${partner} will provide meals where applicable. If you cannot participate due to your assigned task/post, you may submit for reimbursement with receipts of up to ${maxDisplay} per day.`
    : `Meals are not provided by the client. You may submit for reimbursement with receipts of up to ${maxDisplay} per day.`;

  const enabledExpenses = (Object.entries(policy.expenses) as [SowExpenseCategory, { enabled: boolean; coverage: SowExpenseCoverage }][])
    .filter(([, v]) => v.enabled)
    .map(([key, v]) => {
      const label = SOW_EXPENSE_LABELS[key].title;
      return v.coverage === "covered" ? `${label} is covered by the company.` : `${label} expenses are reimbursable with receipts.`;
    });

  const parts = [mealLine, ...enabledExpenses];
  if (policy.general_notes?.trim()) parts.push(policy.general_notes.trim());
  parts.push(
    "This is subject to change and will be communicated where applicable. The final approval of reimbursed expenses is subject to the client.",
  );
  return parts.join(" ");
}

export function buildExpensePolicySummary(policy: SowPerDiemPolicy): string[] {
  const max = policy.max_meal_reimbursement?.trim() || "85.00";
  const maxDisplay = max.startsWith("$") ? max : `$${max}`;
  const items: string[] = [];

  if (policy.meals_provided_by_client) {
    items.push("Meals provided by client where applicable");
  }
  items.push(`Reimbursement up to ${maxDisplay} per day`);

  for (const [key, cfg] of Object.entries(policy.expenses) as [SowExpenseCategory, { enabled: boolean; coverage: SowExpenseCoverage }][]) {
    if (!cfg.enabled) continue;
    const label = SOW_EXPENSE_LABELS[key].title;
    items.push(cfg.coverage === "covered" ? `${label} covered by company` : `${label} expenses reimbursable`);
  }

  items.push("All reimbursements require receipts");
  items.push("Subject to client approval");
  return items;
}
