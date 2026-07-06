"use client";

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Calculator,
  Calendar,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Clock,
  Contact,
  CreditCard,
  FileText,
  Folder,
  FolderKanban,
  GraduationCap,
  Handshake,
  Kanban,
  LayoutGrid,
  LifeBuoy,
  Map,
  Megaphone,
  Monitor,
  Receipt,
  Rocket,
  Route,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CommandCenterCalendar } from "@/components/launchpad/command-center-calendar";
import { CommandCenterSortableBlocks } from "@/components/launchpad/command-center-sortable-layout";
import {
  CommandCenterAddDirectoryCard,
  CommandCenterShortcutDrawer,
} from "@/components/launchpad/command-center-shortcut-drawer";
import { DonutWithLegend, scoreDonutSlices, type DonutSlice } from "@/components/compliance/compliance-donut-chart";
import {
  CC_CARD_BODY_CLASS,
  CC_CARD_CLASS,
  CC_CARD_HEADER_CLASS,
  CC_LINK_CLASS,
  CC_PENDING_APPROVAL_STYLES,
  CC_SECTION_TITLE_CLASS,
  CC_SHORTCUT_GRID,
  CC_SNAPSHOT_GRID,
  CC_STRETCH_ROW,
  CC_STRETCH_ROW_CARD,
  CC_STRETCH_ROW_ICON,
  CC_STRETCH_ROW_ITEM,
  CC_STRETCH_ROW_LABEL,
  ccFrameworkDotClass,
  ccHealthRingColor,
} from "@/components/launchpad/command-center-ui";
import { cn } from "@/lib/utils";
import type { CommandCenterPayload } from "@/lib/launchpad/command-center-types";
import {
  COMMAND_CENTER_SHORTCUT_PREFS_EVENT,
  type CommandCenterShortcutDirectory,
  loadCommandCenterShortcutDirs,
} from "@/lib/launchpad/command-center-shortcut-prefs";
import {
  buildDashboardShortcutOptions,
  type DashboardShortcutOption,
} from "@/lib/launchpad/command-center-shortcut-nav";
import {
  COMMAND_CENTER_LAYOUT_PREFS_EVENT,
  DEFAULT_MAIN_BLOCK_ORDER,
  DEFAULT_SIDEBAR_BLOCK_ORDER,
  type CommandCenterMainBlockId,
  type CommandCenterSidebarBlockId,
  loadMainBlockOrder,
  loadSidebarBlockOrder,
  mergeBlockOrder,
  saveMainBlockOrder,
  saveSidebarBlockOrder,
} from "@/lib/launchpad/command-center-layout-prefs";
import {
  DASHBOARD_SIDEBAR_PREFS_EVENT,
  loadDashboardPrefs,
  type DashboardSidebarPrefs,
} from "@/lib/dashboard-sidebar-prefs";
import { t } from "@/lib/admin-t";

const ICONS: Record<string, LucideIcon> = {
  "alert-triangle": AlertTriangle,
  "bar-chart": BarChart3,
  "book-open": BookOpen,
  "building-2": Building2,
  calculator: Calculator,
  calendar: Calendar,
  "calendar-days": CalendarDays,
  clock: Clock,
  contact: Contact,
  "credit-card": CreditCard,
  "file-text": FileText,
  folder: Folder,
  "folder-kanban": FolderKanban,
  "graduation-cap": GraduationCap,
  handshake: Handshake,
  kanban: Kanban,
  map: Map,
  route: Route,
  "layout-grid": LayoutGrid,
  "life-buoy": LifeBuoy,
  megaphone: Megaphone,
  monitor: Monitor,
  receipt: Receipt,
  rocket: Rocket,
  settings: Settings,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  star: Star,
  store: Store,
  target: Target,
  "trending-down": TrendingDown,
  "trending-up": TrendingUp,
  "user-plus": UserPlus,
  users: Users,
  wallet: Wallet,
  zap: Zap,
};

function linkIcon(name: string): LucideIcon {
  return ICONS[name] ?? Zap;
}

function healthDonutSlices(percent: number, color: string): DonutSlice[] {
  const score = Math.max(0, Math.min(100, percent));
  return [
    { name: "Score", value: score, color },
    { name: "Gap", value: Math.max(0, 100 - score), color: "#e5e7eb" },
  ];
}

type Props = {
  greeting: string;
  data: CommandCenterPayload;
  menuUser: {
    roles: string[];
    permissions: string[];
    activatedPackages: string[];
    primaryRole?: string;
  };
};

function CcCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(CC_CARD_CLASS, className)}>{children}</div>;
}

function CcCardHeader({
  title,
  icon: Icon,
  action,
}: {
  title: string;
  icon?: LucideIcon;
  action?: { label: string; href: string };
}) {
  return (
    <div className={CC_CARD_HEADER_CLASS}>
      <h3 className={cn(CC_SECTION_TITLE_CLASS, "flex items-center gap-2")}>
        {Icon ? <Icon className="h-[18px] w-[18px] text-muted-foreground" strokeWidth={1.75} /> : null}
        {t(title)}
      </h3>
      {action ? (
        <Link href={action.href} className={CC_LINK_CLASS}>
          {t(action.label)}
        </Link>
      ) : null}
    </div>
  );
}

function dueClass(variant: "today" | "soon" | "normal" | "tomorrow") {
  if (variant === "today") return "font-medium text-primary";
  if (variant === "tomorrow") return "font-medium text-orange-600";
  if (variant === "soon") return "font-medium text-primary/80";
  return "text-muted-foreground";
}

function metricToneClass(tone?: "default" | "success" | "danger" | "warning") {
  if (tone === "success") return "font-semibold text-emerald-600";
  if (tone === "danger") return "font-semibold text-destructive";
  if (tone === "warning") return "font-semibold text-amber-600";
  return "font-semibold text-foreground";
}

function priorityBadge(priority: "high" | "medium" | "low") {
  if (priority === "high") {
    return (
      <Badge variant="outline" className="shrink-0 border-red-200 bg-red-50 text-[10px] font-medium text-red-700">
        {t("High Priority")}
      </Badge>
    );
  }
  if (priority === "medium") {
    return (
      <Badge variant="outline" className="shrink-0 border-amber-200 bg-amber-50 text-[10px] font-medium text-amber-800">
        {t("Medium Priority")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="shrink-0 border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-800">
      {t("Low Priority")}
    </Badge>
  );
}

function scheduleDateLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

type ShortcutDrawerMode = "create" | "edit" | "browse";

export function CommandCenterClient({ greeting, data, menuUser }: Props) {
  const [shortcutTenantId, setShortcutTenantId] = React.useState<string | null>(null);
  const [dashboardPrefs, setDashboardPrefs] = React.useState<DashboardSidebarPrefs>({});
  const [customShortcutDirs, setCustomShortcutDirs] = React.useState<CommandCenterShortcutDirectory[]>([]);
  const [shortcutDrawerOpen, setShortcutDrawerOpen] = React.useState(false);
  const [shortcutDrawerMode, setShortcutDrawerMode] = React.useState<ShortcutDrawerMode>("create");
  const [activeShortcutDir, setActiveShortcutDir] = React.useState<CommandCenterShortcutDirectory | null>(null);
  const [mainBlockOrder, setMainBlockOrder] = React.useState<CommandCenterMainBlockId[]>(DEFAULT_MAIN_BLOCK_ORDER);
  const [sidebarBlockOrder, setSidebarBlockOrder] =
    React.useState<CommandCenterSidebarBlockId[]>(DEFAULT_SIDEBAR_BLOCK_ORDER);

  const availableMainBlocks = React.useMemo(() => {
    const blocks = new Set<CommandCenterMainBlockId>([
      "greeting",
      "tasks-activity",
      "pending-approvals",
      "compliance-notifications",
    ]);
    if (data.snapshots.length > 0) blocks.add("snapshots");
    if (data.shortcuts.length > 0 || customShortcutDirs.length > 0 || shortcutTenantId) {
      blocks.add("shortcuts");
    }
    return blocks;
  }, [customShortcutDirs.length, data.shortcuts.length, data.snapshots.length, shortcutTenantId]);

  const availableSidebarBlocks = React.useMemo(() => {
    const blocks = new Set<CommandCenterSidebarBlockId>(["calendar", "schedule"]);
    if (data.healthScores.length > 0) blocks.add("health-score");
    return blocks;
  }, [data.healthScores.length]);

  const orderedMainBlocks = React.useMemo(
    () => mergeBlockOrder(mainBlockOrder, DEFAULT_MAIN_BLOCK_ORDER, availableMainBlocks),
    [availableMainBlocks, mainBlockOrder],
  );

  const orderedSidebarBlocks = React.useMemo(
    () => mergeBlockOrder(sidebarBlockOrder, DEFAULT_SIDEBAR_BLOCK_ORDER, availableSidebarBlocks),
    [availableSidebarBlocks, sidebarBlockOrder],
  );

  const dashboardShortcutOptions = React.useMemo(
    (): DashboardShortcutOption[] =>
      buildDashboardShortcutOptions({
        roles: menuUser.roles,
        permissions: menuUser.permissions,
        activatedPackages: menuUser.activatedPackages,
        primaryRole: menuUser.primaryRole,
        dashboardPrefs,
      }),
    [dashboardPrefs, menuUser],
  );

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/auth/me", { credentials: "same-origin" });
        const j = (await r.json()) as { dashboardSidebarTenantId?: string | null };
        if (cancelled) return;
        const tid = typeof j.dashboardSidebarTenantId === "string" ? j.dashboardSidebarTenantId.trim() : "";
        setShortcutTenantId(tid.length ? tid : null);
        if (tid.length) {
          setDashboardPrefs(loadDashboardPrefs(tid));
        } else {
          setDashboardPrefs({});
        }
      } catch {
        if (!cancelled) setShortcutTenantId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!shortcutTenantId) {
      setCustomShortcutDirs([]);
      return;
    }
    const sync = () => setCustomShortcutDirs(loadCommandCenterShortcutDirs(shortcutTenantId));
    sync();
    const onEvt = (e: Event) => {
      const ce = e as CustomEvent<{ tenantId?: string }>;
      if (ce.detail?.tenantId && ce.detail.tenantId !== shortcutTenantId) return;
      sync();
    };
    window.addEventListener(COMMAND_CENTER_SHORTCUT_PREFS_EVENT, onEvt);
    return () => window.removeEventListener(COMMAND_CENTER_SHORTCUT_PREFS_EVENT, onEvt);
  }, [shortcutTenantId]);

  React.useEffect(() => {
    if (!shortcutTenantId) {
      setDashboardPrefs({});
      return;
    }
    const syncPrefs = () => setDashboardPrefs(loadDashboardPrefs(shortcutTenantId));
    syncPrefs();
    const onPrefsEvt = (e: Event) => {
      const ce = e as CustomEvent<{ tenantId?: string }>;
      if (ce.detail?.tenantId && ce.detail.tenantId !== shortcutTenantId) return;
      syncPrefs();
    };
    window.addEventListener(DASHBOARD_SIDEBAR_PREFS_EVENT, onPrefsEvt);
    return () => window.removeEventListener(DASHBOARD_SIDEBAR_PREFS_EVENT, onPrefsEvt);
  }, [shortcutTenantId]);

  React.useEffect(() => {
    const syncLayout = () => {
      setMainBlockOrder(
        mergeBlockOrder(
          shortcutTenantId ? loadMainBlockOrder(shortcutTenantId) : undefined,
          DEFAULT_MAIN_BLOCK_ORDER,
          availableMainBlocks,
        ),
      );
      setSidebarBlockOrder(
        mergeBlockOrder(
          shortcutTenantId ? loadSidebarBlockOrder(shortcutTenantId) : undefined,
          DEFAULT_SIDEBAR_BLOCK_ORDER,
          availableSidebarBlocks,
        ),
      );
    };
    syncLayout();
    if (!shortcutTenantId) return;
    const onLayoutEvt = (e: Event) => {
      const ce = e as CustomEvent<{ tenantId?: string }>;
      if (ce.detail?.tenantId && ce.detail.tenantId !== shortcutTenantId) return;
      syncLayout();
    };
    window.addEventListener(COMMAND_CENTER_LAYOUT_PREFS_EVENT, onLayoutEvt);
    return () => window.removeEventListener(COMMAND_CENTER_LAYOUT_PREFS_EVENT, onLayoutEvt);
  }, [availableMainBlocks, availableSidebarBlocks, shortcutTenantId]);

  const handleMainBlockReorder = React.useCallback(
    (next: CommandCenterMainBlockId[]) => {
      setMainBlockOrder(next);
      if (shortcutTenantId) saveMainBlockOrder(shortcutTenantId, next);
    },
    [shortcutTenantId],
  );

  const handleSidebarBlockReorder = React.useCallback(
    (next: CommandCenterSidebarBlockId[]) => {
      setSidebarBlockOrder(next);
      if (shortcutTenantId) saveSidebarBlockOrder(shortcutTenantId, next);
    },
    [shortcutTenantId],
  );

  const openShortcutDrawer = (mode: ShortcutDrawerMode, directory: CommandCenterShortcutDirectory | null = null) => {
    setShortcutDrawerMode(mode);
    setActiveShortcutDir(directory);
    setShortcutDrawerOpen(true);
  };
  const calendarEvents = data.calendarEvents.map((e) => ({
    id: e.id,
    date: e.date,
    label: e.type === "compliance" ? "C" : e.type === "pto" ? "P" : e.type === "project" ? "P" : "D",
    color: e.color,
    title: e.label,
  }));

  const topHealth = data.healthScores.slice(0, 3);
  const bottomHealth = data.healthScores.slice(3, 5);

  const renderMainBlock = (blockId: CommandCenterMainBlockId) => {
    switch (blockId) {
      case "greeting":
        return (
          <section className="space-y-4 pb-1">
            <div>
              <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-foreground">{greeting} 👋</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {t("Here's what's happening across your business today.")}
              </p>
            </div>

            {data.quickActions.length > 0 ? (
              <div className={CC_STRETCH_ROW_CARD}>
                <div className={CC_STRETCH_ROW}>
                  {data.quickActions.map((action) => {
                    const Icon = linkIcon(action.icon);
                    return (
                      <Link key={action.id} href={action.href} className={CC_STRETCH_ROW_ITEM}>
                        <span className={cn(CC_STRETCH_ROW_ICON, action.colorClass)}>
                          <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} />
                        </span>
                        <span className={CC_STRETCH_ROW_LABEL}>{t(action.label)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>
        );

      case "tasks-activity":
        return (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CcCard>
              <CcCardHeader title="My Tasks" icon={CheckSquare} action={{ label: "View All Tasks", href: "/compliance/tasks" }} />
              <div className={CC_CARD_BODY_CLASS}>
                {data.tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("You're all caught up.")}</p>
                ) : (
                  <ul className="space-y-3.5">
                    {data.tasks.map((task) => (
                      <li key={task.id}>
                        <Link
                          href={task.href}
                          className="group flex items-start gap-3 rounded-md py-0.5 transition-colors hover:bg-muted/40"
                        >
                          <Checkbox
                            className="mt-0.5 h-4 w-4 rounded-[4px]"
                            aria-label={task.label}
                            onClick={(e) => e.preventDefault()}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium leading-snug text-foreground group-hover:text-primary">
                              {task.label}
                            </p>
                            <p className={cn("mt-0.5 text-[11px]", dueClass(task.dueVariant))}>{task.dueLabel}</p>
                          </div>
                          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CcCard>

            <CcCard>
              <CcCardHeader title="Recent Activity" icon={Clock} action={{ label: "View All Activity", href: "/launchpad" }} />
              <div className={CC_CARD_BODY_CLASS}>
                {data.recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("Activity will appear here as your team gets started.")}</p>
                ) : (
                  <ul className="space-y-2.5">
                    {data.recentActivity.map((item) => {
                      const Icon = linkIcon(item.icon);
                      return (
                        <li key={item.id} className="flex items-center gap-2.5 rounded-md px-0.5 py-1">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/80 ring-1 ring-border/50">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                          </span>
                          <p className="min-w-0 flex-1 text-[13px] leading-snug text-foreground">{item.message}</p>
                          <span className="shrink-0 text-[11px] text-muted-foreground">{item.timeLabel}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </CcCard>
          </div>
        );

      case "pending-approvals":
        return (
          <section className="space-y-3">
            <h2 className={CC_SECTION_TITLE_CLASS}>{t("Pending Approvals")}</h2>
            {data.pendingApprovals.length > 0 ? (
              <div className={CC_STRETCH_ROW_CARD}>
                <div className={CC_STRETCH_ROW}>
                  {data.pendingApprovals.map((item) => {
                    const Icon = linkIcon(item.icon);
                    const styles = CC_PENDING_APPROVAL_STYLES[item.id] ?? CC_PENDING_APPROVAL_STYLES.policy;
                    return (
                      <Link key={item.id} href={item.href} className={CC_STRETCH_ROW_ITEM}>
                        <span className={cn(CC_STRETCH_ROW_ICON, styles.colorClass)}>
                          <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} />
                        </span>
                        <span className={CC_STRETCH_ROW_LABEL}>{t(item.label)}</span>
                        <span className="text-[13px] font-bold leading-none tabular-nums text-foreground">
                          {item.count}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("No pending approvals.")}</p>
            )}
          </section>
        );

      case "snapshots":
        return (
          <div className={CC_SNAPSHOT_GRID}>
            {data.snapshots.map((snap) => (
              <CcCard key={snap.id} className="h-full">
                <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                  <h3 className="text-[13px] font-semibold text-foreground">{t(snap.title)}</h3>
                  <Link href={snap.href} className={CC_LINK_CLASS}>
                    {t("View")}
                  </Link>
                </div>
                <div className="space-y-2 px-4 py-3">
                  {snap.rows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="text-muted-foreground">{t(row.label)}</span>
                      <span className={cn("tabular-nums", metricToneClass(row.tone))}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </CcCard>
            ))}
          </div>
        );

      case "compliance-notifications":
        return (
          <div className={cn("grid grid-cols-1 gap-4", data.compliance && "lg:grid-cols-2")}>
            {data.compliance ? (
              <CcCard>
                <CcCardHeader title="Compliance Center" icon={ShieldCheck} />
                <div className={cn(CC_CARD_BODY_CLASS, "space-y-4")}>
                  <div className="flex items-center gap-5">
                    <DonutWithLegend
                      data={scoreDonutSlices(data.compliance.score)}
                      centerLabel={`${data.compliance.score}%`}
                      size={104}
                      hideLegend
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t("Overall Compliance Score")}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{t("Across active frameworks")}</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {data.compliance.frameworks.map((fw) => (
                      <div key={fw.label} className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", ccFrameworkDotClass(fw.percent))} />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium">{fw.label}</span>
                        <div className="mx-1 hidden h-1.5 max-w-[88px] flex-1 overflow-hidden rounded-full bg-muted sm:block">
                          <div
                            className={cn("h-full rounded-full", ccFrameworkDotClass(fw.percent))}
                            style={{ width: `${fw.percent}%` }}
                          />
                        </div>
                        <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{fw.percent}%</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {data.compliance.actions.map((action) => (
                      <Button key={action.label} variant="outline" size="sm" className="h-8 border-border/70 text-xs font-normal" asChild>
                        <Link href={action.href}>{t(action.label)}</Link>
                      </Button>
                    ))}
                  </div>
                </div>
              </CcCard>
            ) : null}

            <CcCard>
              <CcCardHeader title="Notifications Center" icon={Bell} />
              <div className={CC_CARD_BODY_CLASS}>
                {data.notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("No new notifications.")}</p>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {data.notifications.map((n) => {
                      const Icon = linkIcon(n.icon ?? "sparkles");
                      return (
                        <li key={n.id}>
                          {n.href ? (
                            <Link
                              href={n.href}
                              className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/30"
                            >
                              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/80">
                                <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                              </span>
                              <p className="min-w-0 flex-1 text-[13px] leading-snug text-foreground">{n.message}</p>
                              {priorityBadge(n.priority)}
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                            </Link>
                          ) : (
                            <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/80">
                                <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                              </span>
                              <p className="min-w-0 flex-1 text-[13px] leading-snug text-foreground">{n.message}</p>
                              {priorityBadge(n.priority)}
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </CcCard>
          </div>
        );

      case "shortcuts":
        return (
          <section className="space-y-3">
            <h2 className={CC_SECTION_TITLE_CLASS}>{t("Command Center Shortcuts")}</h2>
            <div className={CC_SHORTCUT_GRID}>
              {data.shortcuts.map((shortcut) => {
                const Icon = linkIcon(shortcut.icon);
                return (
                  <Link key={shortcut.id} href={shortcut.href}>
                    <div className={cn(CC_CARD_CLASS, "flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/20")}>
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", shortcut.colorClass)}>
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                      <span className="text-[13px] font-medium leading-tight text-foreground">{t(shortcut.label)}</span>
                    </div>
                  </Link>
                );
              })}
              {customShortcutDirs.map((dir) => {
                const Icon = linkIcon(dir.icon);
                return (
                  <button
                    key={dir.id}
                    type="button"
                    onClick={() => openShortcutDrawer("browse", dir)}
                    className="text-left"
                  >
                    <div className={cn(CC_CARD_CLASS, "flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/20")}>
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", dir.colorClass)}>
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                      <span className="text-[13px] font-medium leading-tight text-foreground">{dir.label}</span>
                    </div>
                  </button>
                );
              })}
              {shortcutTenantId ? (
                <CommandCenterAddDirectoryCard onClick={() => openShortcutDrawer("create")} />
              ) : null}
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  const renderSidebarBlock = (blockId: CommandCenterSidebarBlockId) => {
    switch (blockId) {
      case "calendar":
        return (
          <CcCard>
            <div className="border-b border-border/50 px-4 py-3">
              <h3 className={CC_SECTION_TITLE_CLASS}>{t("Calendar")}</h3>
            </div>
            <div className="px-3 py-3">
              <CommandCenterCalendar events={calendarEvents} />
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-border/40 pt-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  {t("Projects")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  {t("Deadlines")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  {t("PTO")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-violet-500" />
                  {t("Compliance")}
                </span>
              </div>
            </div>
          </CcCard>
        );

      case "schedule":
        return (
          <CcCard>
            <div className="border-b border-border/50 px-4 py-3">
              <h3 className={CC_SECTION_TITLE_CLASS}>{t("Today's Schedule")}</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{scheduleDateLabel()}</p>
            </div>
            <div className={CC_CARD_BODY_CLASS}>
              {data.schedule.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("No events scheduled today.")}</p>
              ) : (
                <ul className="space-y-3">
                  {data.schedule.map((item) => (
                    <li key={item.id} className="flex items-start gap-2.5 text-[12px]">
                      <span className="w-[62px] shrink-0 pt-0.5 text-[11px] text-muted-foreground">{item.time}</span>
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.dotColor }} />
                      <span className="leading-snug text-foreground">{item.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CcCard>
        );

      case "health-score":
        return (
          <CcCard>
            <div className="border-b border-border/50 px-4 py-3">
              <h3 className={CC_SECTION_TITLE_CLASS}>{t("Company Health Score")}</h3>
            </div>
            <div className="px-4 py-4">
              <div className="flex flex-col items-center gap-4">
                <div className="grid w-full grid-cols-3 gap-2">
                  {topHealth.map((score) => (
                    <div key={score.id} className="flex flex-col items-center gap-1">
                      <DonutWithLegend
                        data={healthDonutSlices(score.percent, ccHealthRingColor(score.id))}
                        centerLabel={`${score.percent}%`}
                        size={68}
                        hideLegend
                      />
                      <span className="text-center text-[10px] font-medium leading-tight text-muted-foreground">
                        {t(score.label)}
                      </span>
                    </div>
                  ))}
                </div>
                {bottomHealth.length > 0 ? (
                  <div className="flex justify-center gap-6">
                    {bottomHealth.map((score) => (
                      <div key={score.id} className="flex flex-col items-center gap-1">
                        <DonutWithLegend
                          data={healthDonutSlices(score.percent, ccHealthRingColor(score.id))}
                          centerLabel={`${score.percent}%`}
                          size={68}
                          hideLegend
                        />
                        <span className="text-center text-[10px] font-medium leading-tight text-muted-foreground">
                          {t(score.label)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </CcCard>
        );

      default:
        return null;
    }
  };

  return (
    <div className="-m-3 flex flex-col gap-5 bg-muted/20 p-3 sm:-m-4 sm:p-4 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1">
        <CommandCenterSortableBlocks
          blockIds={orderedMainBlocks}
          onReorder={handleMainBlockReorder}
          renderBlock={renderMainBlock}
        />

        <CommandCenterShortcutDrawer
          open={shortcutDrawerOpen}
          onOpenChange={setShortcutDrawerOpen}
          tenantId={shortcutTenantId}
          mode={shortcutDrawerMode}
          directory={activeShortcutDir}
          dashboardOptions={dashboardShortcutOptions}
          onSaved={() => {
            if (shortcutTenantId) {
              setCustomShortcutDirs(loadCommandCenterShortcutDirs(shortcutTenantId));
            }
          }}
          onEditRequest={() => setShortcutDrawerMode("edit")}
        />
      </div>

      <aside className="w-full shrink-0 xl:w-[300px]">
        <CommandCenterSortableBlocks
          blockIds={orderedSidebarBlocks}
          onReorder={handleSidebarBlockReorder}
          renderBlock={renderSidebarBlock}
        />
      </aside>
    </div>
  );
}
