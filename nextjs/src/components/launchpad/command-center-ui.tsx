/** Command Center design tokens — aligned to Launchpad mockup. */
export const CC_PAGE_CLASS = "space-y-5";

export const CC_CARD_CLASS =
  "rounded-xl border border-border/70 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export const CC_CARD_HEADER_CLASS = "flex flex-row items-center justify-between space-y-0 border-b border-border/50 px-5 py-3.5";

export const CC_CARD_BODY_CLASS = "px-5 py-4";

export const CC_SECTION_TITLE_CLASS = "text-[15px] font-semibold text-foreground";

export const CC_LINK_CLASS = "text-xs font-medium text-primary hover:underline";

export const CC_QUICK_ACTION_GRID = "grid grid-cols-4 gap-4 sm:grid-cols-8";

export const CC_SNAPSHOT_GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4";

export const CC_SHORTCUT_GRID = "grid grid-cols-2 gap-3 lg:grid-cols-4";

export const CC_APPROVAL_GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5";

/** Full-width icon row — shared by quick actions and pending approvals. */
export const CC_STRETCH_ROW_CARD = `${CC_CARD_CLASS} w-full px-4 py-4`;
export const CC_STRETCH_ROW = "flex w-full items-start";
export const CC_STRETCH_ROW_ITEM =
  "group flex min-w-0 flex-1 flex-col items-center gap-2 px-1 text-center";
export const CC_STRETCH_ROW_ICON =
  "flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-[1.03]";
export const CC_STRETCH_ROW_LABEL = "text-[11px] font-medium leading-tight text-foreground";

export const CC_PENDING_APPROVAL_STYLES: Record<
  string,
  { card: string; icon: string; colorClass: string }
> = {
  vacation: {
    card: "border-blue-200/80 bg-blue-50/40 hover:bg-blue-50/70",
    icon: "text-blue-600",
    colorClass: "bg-blue-500/15 text-blue-600",
  },
  expense: {
    card: "border-emerald-200/80 bg-emerald-50/40 hover:bg-emerald-50/70",
    icon: "text-emerald-600",
    colorClass: "bg-emerald-500/15 text-emerald-600",
  },
  payroll: {
    card: "border-amber-200/80 bg-amber-50/40 hover:bg-amber-50/70",
    icon: "text-amber-600",
    colorClass: "bg-amber-500/15 text-amber-600",
  },
  vendor: {
    card: "border-violet-200/80 bg-violet-50/40 hover:bg-violet-50/70",
    icon: "text-violet-600",
    colorClass: "bg-violet-500/15 text-violet-600",
  },
  policy: {
    card: "border-rose-200/80 bg-rose-50/40 hover:bg-rose-50/70",
    icon: "text-rose-600",
    colorClass: "bg-rose-500/15 text-rose-600",
  },
};

export function ccFrameworkDotClass(percent: number) {
  if (percent >= 80) return "bg-emerald-500";
  if (percent >= 60) return "bg-amber-500";
  return "bg-orange-500";
}

export function ccHealthRingColor(id: string) {
  const map: Record<string, string> = {
    hr: "#22c55e",
    compliance: "#8b5cf6",
    projects: "#3b82f6",
    crm: "#ec4899",
    finance: "#14b8a6",
  };
  return map[id] ?? "#3b82f6";
}
