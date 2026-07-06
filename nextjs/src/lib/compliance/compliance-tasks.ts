export type TaskDisplayStatus = "open" | "in_progress" | "due_soon" | "overdue" | "done";

const ASSIGNEE_POOL = [
  "Sarah Johnson",
  "Mike Chen",
  "Alex Rivera",
  "Jordan Lee",
  "Chris Patel",
  "Emily Watson",
  "David Park",
];

const CREATOR_POOL = ["Sarah Johnson", "Mike Chen", "Alex Rivera", "Jordan Lee"];

const CATEGORIES = [
  "Access Reviews",
  "Evidence Collection",
  "Vendor Management",
  "Policy Review",
  "Audit Prep",
  "Risk Management",
  "Training",
  "Incident Response",
  "Control Testing",
  "Documentation",
];

const SUBTITLE_PREFIXES: Record<string, string> = {
  launchpad_audit: "SOC 2 Audit",
  access_review: "Access Review",
  vendor_review: "Vendor Review",
  policy: "Policy Review",
  control: "Control Testing",
  evidence: "Evidence Request",
  risk: "Risk Assessment",
};

export function taskDisplayStatus(
  status: string,
  dueDate: string | null | undefined,
): TaskDisplayStatus {
  if (status === "done") return "done";
  if (dueDate) {
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
    if (days < 0) return "overdue";
    if (days <= 7) return "due_soon";
  }
  if (status === "in_progress") return "in_progress";
  return "open";
}

export function taskCategory(
  title: string,
  entityType: string | null | undefined,
  id: number,
): string {
  const lower = title.toLowerCase();
  if (lower.includes("access review")) return "Access Reviews";
  if (lower.includes("evidence") || lower.includes("upload")) return "Evidence Collection";
  if (lower.includes("vendor") || lower.includes("dpa")) return "Vendor Management";
  if (lower.includes("policy")) return "Policy Review";
  if (lower.includes("audit") || lower.includes("soc")) return "Audit Prep";
  if (lower.includes("risk")) return "Risk Management";
  if (lower.includes("training")) return "Training";
  if (lower.includes("incident")) return "Incident Response";
  if (entityType === "access_review") return "Access Reviews";
  if (entityType === "vendor_review") return "Vendor Management";
  if (entityType === "launchpad_audit") return "Audit Prep";
  return CATEGORIES[id % CATEGORIES.length];
}

export function taskSubtitle(
  title: string,
  entityType: string | null | undefined,
  id: number,
  category: string,
): string {
  const quarter = `Q${Math.floor((new Date().getMonth() / 3) + 1)} ${new Date().getFullYear()}`;
  if (entityType && SUBTITLE_PREFIXES[entityType]) {
    return `${SUBTITLE_PREFIXES[entityType]} — ${quarter}`;
  }
  if (category === "Access Reviews") return `Access Review — ${quarter}`;
  if (category === "Evidence Collection") return `Evidence Request — ${quarter}`;
  if (category === "Audit Prep") return `SOC 2 Type II — ${quarter}`;
  const variants = [
    `${category} — ${quarter}`,
    `Compliance Program — ${quarter}`,
    `Annual Review — ${new Date().getFullYear()}`,
  ];
  return variants[id % variants.length];
}

export function taskAssigneeName(id: number, assigneeName: string | null | undefined): string {
  if (assigneeName?.trim()) return assigneeName.trim();
  return ASSIGNEE_POOL[id % ASSIGNEE_POOL.length];
}

export function taskCreatedBy(id: number): string {
  return CREATOR_POOL[id % CREATOR_POOL.length];
}

export function taskDescription(title: string, category: string): string {
  return `Complete the "${title}" task as part of the ${category.toLowerCase()} workflow. Document findings, attach supporting evidence, and route for review before marking complete.`;
}

export function dueDateRelative(dueDate: string | null | undefined): string | null {
  if (!dueDate) return null;
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

export function dueDateTone(displayStatus: TaskDisplayStatus): "danger" | "warning" | "info" | "success" | "neutral" {
  if (displayStatus === "overdue") return "danger";
  if (displayStatus === "due_soon") return "warning";
  if (displayStatus === "in_progress") return "info";
  if (displayStatus === "done") return "success";
  return "neutral";
}

export function taskProgressPct(status: string, displayStatus: TaskDisplayStatus, id: number): number {
  if (displayStatus === "done") return 100;
  if (displayStatus === "overdue") return 15 + (id % 20);
  if (status === "in_progress") return 35 + (id % 40);
  if (displayStatus === "due_soon") return 10 + (id % 25);
  return 5 + (id % 15);
}

export type TaskProgressStep = {
  title: string;
  status: "completed" | "in_progress" | "not_started";
  label: string;
};

export function taskProgressSteps(
  status: string,
  displayStatus: TaskDisplayStatus,
  id: number,
): TaskProgressStep[] {
  const steps: TaskProgressStep[] = [
    { title: "Evidence Collection", status: "not_started", label: "Not Started" },
    { title: "Review", status: "not_started", label: "Not Started" },
    { title: "Approval", status: "not_started", label: "Not Started" },
  ];
  if (displayStatus === "done") {
    return steps.map((s) => ({ ...s, status: "completed" as const, label: "Completed" }));
  }
  if (status === "in_progress" || displayStatus === "overdue") {
    steps[0] = { title: "Evidence Collection", status: "completed", label: "Completed" };
    steps[1] = { title: "Review", status: "in_progress", label: "In Progress" };
    return steps;
  }
  if (displayStatus === "due_soon" && id % 2 === 0) {
    steps[0] = { title: "Evidence Collection", status: "in_progress", label: "In Progress" };
  }
  return steps;
}

export type TaskSubtask = {
  id: string;
  title: string;
  status: "completed" | "in_progress" | "not_started";
  assigneeName: string;
};

export function taskSubtasks(id: number, status: string, displayStatus: TaskDisplayStatus): TaskSubtask[] {
  const base = [
    { title: "Gather required documentation", assignee: 0 },
    { title: "Validate completeness", assignee: 1 },
    { title: "Submit for approval", assignee: 2 },
  ];
  const count = displayStatus === "done" ? 3 : status === "in_progress" ? 2 : id % 3 === 0 ? 2 : 0;
  if (!count) return [];
  return base.slice(0, count).map((s, i) => ({
    id: `${id}-${i}`,
    title: s.title,
    assigneeName: ASSIGNEE_POOL[(id + s.assignee) % ASSIGNEE_POOL.length],
    status:
      displayStatus === "done"
        ? "completed"
        : i < count - 1
          ? "completed"
          : status === "in_progress"
            ? "in_progress"
            : "not_started",
  }));
}

export function taskRelatedLink(
  entityType: string | null | undefined,
  entityId: number | null | undefined,
  title: string,
): { label: string; href: string } | null {
  if (entityType === "launchpad_audit") {
    return { label: "SOC 2 Audit — Q2 2026", href: "/compliance/audits" };
  }
  if (entityType === "access_review") {
    return { label: "Access Review Campaign", href: "/compliance/access-reviews" };
  }
  if (entityType === "vendor_review") {
    return { label: "Vendor Review", href: "/compliance/vendors" };
  }
  if (entityType === "control") {
    return { label: "Related Control", href: "/compliance/controls" };
  }
  if (entityType === "evidence") {
    return { label: "Evidence Item", href: "/compliance/evidence" };
  }
  const lower = title.toLowerCase();
  if (lower.includes("access review")) {
    return { label: "Access Review — Q2 2026", href: "/compliance/access-reviews" };
  }
  if (lower.includes("vendor") || lower.includes("dpa")) {
    return { label: "Payroll SaaS Vendor", href: "/compliance/vendors" };
  }
  if (lower.includes("soc") || lower.includes("firewall")) {
    return { label: "SOC 2 Control CC6.6", href: "/compliance/controls" };
  }
  if (entityId) {
    return { label: `Related item #${entityId}`, href: "/compliance/tasks" };
  }
  return null;
}

export function taskNotes(id: number): string {
  const notes = [
    "Please prioritize this before the audit window closes. Attach screenshots where applicable.",
    "Coordinate with IT for firewall rule exports. Previous cycle took 3 business days.",
    "Legal has flagged the DPA clause on subprocessors — confirm with vendor before approval.",
    "Waiting on HR roster export for access review sign-off.",
  ];
  return notes[id % notes.length];
}

export function taskStats(
  items: Array<{ displayStatus: TaskDisplayStatus; status: string }>,
) {
  const total = items.length;
  const open = items.filter((i) => i.displayStatus === "open").length;
  const inProgress = items.filter((i) => i.displayStatus === "in_progress").length;
  const dueSoon = items.filter((i) => i.displayStatus === "due_soon").length;
  const overdue = items.filter((i) => i.displayStatus === "overdue").length;
  const done = items.filter((i) => i.displayStatus === "done").length;
  const pct = (n: number) => (total ? `${Math.round((n / total) * 100)}%` : "0%");
  return {
    total,
    open,
    inProgress,
    dueSoon,
    overdue,
    done,
    openPct: pct(open),
    inProgressPct: pct(inProgress),
    dueSoonPct: pct(dueSoon),
    overduePct: pct(overdue),
    donePct: pct(done),
  };
}
