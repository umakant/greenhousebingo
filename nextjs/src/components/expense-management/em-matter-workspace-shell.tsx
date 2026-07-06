"use client";

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BarChart3,
  Briefcase,
  ClipboardList,
  Clock,
  FileStack,
  FileText,
  History,
  LayoutDashboard,
  Receipt,
  StickyNote,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/contexts/translation-context";
import { EmMatterHeader } from "@/components/expense-management/em-matter-header";
import {
  EM_WORKSPACE_DOCUMENTS_CHANGED_EVENT,
  EM_WORKSPACE_NOTES_CHANGED_EVENT,
} from "@/lib/em-workspace-events";
import { filterEmMatterNavIds, isEmEmployeeMatterWorkspaceView } from "@/lib/em-matter-nav";
import { cn } from "@/lib/utils";

export type EmMatterNavId =
  | "operation"
  | "timesheets"
  | "expenses"
  | "costtransfer"
  | "billing"
  | "notes"
  | "documents"
  | "timeline"
  | "receipts"
  | "reports";

type NavItem = {
  id: EmMatterNavId;
  href: string;
  labelKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  count?: number;
};

const PRIMARY_NAV: NavItem[] = [
  {
    id: "operation",
    href: "/expense-management/operation-details",
    labelKey: "Operation Details",
    descriptionKey: "Matter dates, departments, location, and operational flags for this workspace.",
    icon: ClipboardList,
  },
  {
    id: "timesheets",
    href: "/expense-management/time-sheets",
    labelKey: "Time Sheets",
    descriptionKey: "Track time entries linked to this operations workspace.",
    icon: Clock,
  },
  {
    id: "expenses",
    href: "/expense-management/expenses",
    labelKey: "Expenses",
    descriptionKey: "View and manage expense lines for this matter.",
    icon: Wallet,
  },
  {
    id: "costtransfer",
    href: "/expense-management/cost-transfer",
    labelKey: "Cost Transfer Details",
    descriptionKey: "Record cost transfers between departments or matters.",
    icon: ArrowLeftRight,
  },
  {
    id: "billing",
    href: "/expense-management/client-billing",
    labelKey: "Client Billing Summary",
    descriptionKey: "Client billing totals and billable summaries for this workspace.",
    icon: FileText,
  },
  {
    id: "notes",
    href: "/expense-management/matter-notes",
    labelKey: "Notes",
    descriptionKey: "Internal notes and commentary for this matter.",
    icon: StickyNote,
  },
  {
    id: "documents",
    href: "/expense-management/matter-documents",
    labelKey: "Documents",
    descriptionKey: "Files and attachments stored against this matter.",
    icon: FileStack,
    count: 0,
  },
  {
    id: "timeline",
    href: "/expense-management/approval-timeline",
    labelKey: "Approval Timeline",
    descriptionKey: "Approval history and workflow status for this workspace.",
    icon: History,
  },
];

const SECONDARY_NAV: NavItem[] = [
  {
    id: "receipts",
    href: "/expense-management/receipts",
    labelKey: "Receipts",
    descriptionKey: "Receipt images and attachments on file for expense lines.",
    icon: Receipt,
  },
  {
    id: "reports",
    href: "/expense-management/reports",
    labelKey: "Reports",
    descriptionKey: "Expense reports and submission status for your organization.",
    icon: BarChart3,
  },
];

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

/**
 * Operations workspace — Settings-style layout: vertical section nav (left) + section card (right).
 */
export function EmMatterWorkspaceShell({
  active,
  panelTitle,
  children,
  notesCount: notesCountProp,
  permissions = [],
  roles = [],
  userType = null,
}: {
  active: EmMatterNavId;
  panelTitle: string;
  children: React.ReactNode;
  /** When set, overrides the fetched notes count in the sidebar. */
  notesCount?: number;
  /** When set, portal employees only see Expenses, Receipts, and Reports. */
  permissions?: string[];
  roles?: string[];
  userType?: string | null;
}) {
  const { t: tLang } = useTranslation();
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);
  const [notesCount, setNotesCount] = React.useState<number | null>(notesCountProp ?? null);
  const [documentsCount, setDocumentsCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (notesCountProp !== undefined) setNotesCount(notesCountProp);
  }, [notesCountProp]);

  const fetchNotesCount = React.useCallback(async () => {
    try {
      const res = await fetch("/api/expense-management/workspace-notes?per_page=1", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as { total?: number } | null;
      if (res.ok && typeof json?.total === "number") setNotesCount(json.total);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchDocumentsCount = React.useCallback(async () => {
    try {
      const res = await fetch("/api/expense-management/workspace-documents", {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as { total?: number } | null;
      if (res.ok && typeof json?.total === "number") setDocumentsCount(json.total);
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    void fetchNotesCount();
    void fetchDocumentsCount();
    const onNotes = () => void fetchNotesCount();
    const onDocs = () => void fetchDocumentsCount();
    window.addEventListener(EM_WORKSPACE_NOTES_CHANGED_EVENT, onNotes);
    window.addEventListener(EM_WORKSPACE_DOCUMENTS_CHANGED_EVENT, onDocs);
    return () => {
      window.removeEventListener(EM_WORKSPACE_NOTES_CHANGED_EVENT, onNotes);
      window.removeEventListener(EM_WORKSPACE_DOCUMENTS_CHANGED_EVENT, onDocs);
    };
  }, [fetchNotesCount, fetchDocumentsCount]);

  const isEmployeeView = React.useMemo(
    () => isEmEmployeeMatterWorkspaceView({ permissions, roles, userType }),
    [permissions, roles, userType],
  );

  const navItems = React.useMemo(() => {
    const allowedIds = filterEmMatterNavIds(
      ALL_NAV.map((item) => item.id),
      { permissions, roles, userType },
    );
    const allowed = new Set(allowedIds);
    return ALL_NAV.filter((item) => allowed.has(item.id)).map((item) => {
      if (item.id === "notes" && notesCount !== null) return { ...item, count: notesCount };
      if (item.id === "documents" && documentsCount !== null) return { ...item, count: documentsCount };
      return item;
    });
  }, [notesCount, documentsCount, permissions, roles, userType]);

  const meta = navItems.find((item) => item.id === active);
  const SectionIcon = meta?.icon ?? Briefcase;

  return (
    <>
      <EmMatterHeader />
      <div className="flex flex-col md:flex-row gap-8">
      <aside className="md:w-64 shrink-0">
        <div className="md:sticky md:top-4 space-y-3">
          <div className="md:hidden -mx-1 px-1">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {navItems.map((item) => (
                <WorkspaceNavButton key={item.id} item={item} active={active} t={t} compact />
              ))}
            </div>
          </div>

          <ScrollArea className="hidden md:block h-[min(70vh,calc(100vh-8rem))]">
            <nav className="pr-4 space-y-1" aria-label={t("Operations workspace sections")}>
              {isEmployeeView ? (
                navItems.map((item) => (
                  <WorkspaceNavButton key={item.id} item={item} active={active} t={t} />
                ))
              ) : (
                <>
                  {navItems
                    .filter((item) => PRIMARY_NAV.some((p) => p.id === item.id))
                    .map((item) => (
                      <WorkspaceNavButton key={item.id} item={item} active={active} t={t} />
                    ))}
                  <Separator className="my-2" />
                  {navItems
                    .filter((item) => SECONDARY_NAV.some((p) => p.id === item.id))
                    .map((item) => (
                      <WorkspaceNavButton key={item.id} item={item} active={active} t={t} />
                    ))}
                </>
              )}
            </nav>
          </ScrollArea>

          <Button asChild variant="outline" size="sm" className="hidden md:inline-flex w-full">
            <Link href="/expense-management" className="inline-flex items-center justify-center gap-2">
              <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
              {t("Expense dashboard")}
            </Link>
          </Button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex md:hidden justify-end">
          <Button asChild variant="outline" size="sm">
            <Link href="/expense-management" className="inline-flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
              {t("Expense dashboard")}
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <SectionIcon className="h-5 w-5 shrink-0" aria-hidden />
                {panelTitle}
              </CardTitle>
              {meta ? <CardDescription className="mt-1">{t(meta.descriptionKey)}</CardDescription> : null}
            </div>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}

function WorkspaceNavButton({
  item,
  active,
  t,
  compact,
}: {
  item: NavItem;
  active: EmMatterNavId;
  t: (s: string) => string;
  compact?: boolean;
}) {
  const Icon = item.icon;
  const isActive = active === item.id;

  if (compact) {
    return (
      <Button asChild variant={isActive ? "default" : "outline"} size="sm" className="shrink-0">
        <Link href={item.href} className="inline-flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="whitespace-nowrap">{t(item.labelKey)}</span>
        </Link>
      </Button>
    );
  }

  return (
    <Button
      asChild
      variant="ghost"
      className={cn("h-auto w-full justify-start py-2", isActive && "bg-muted font-medium")}
    >
      <Link href={item.href} className="inline-flex w-full items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate text-left">{t(item.labelKey)}</span>
        {item.count !== undefined ? (
          <span className="ml-auto tabular-nums text-xs text-muted-foreground">({item.count})</span>
        ) : null}
      </Link>
    </Button>
  );
}
