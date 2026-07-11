"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, MoreVertical } from "lucide-react";
import { useTranslation } from "@/contexts/translation-context";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types";
import { resolveDashboardScopeFromPath } from "@/utils/menu";
import { patchDashboardPrefs } from "@/lib/dashboard-sidebar-prefs";

/** Pathname matches href exactly, as a nested route, or via legacy aliases. */
function normalizeNavPath(pathname: string): string {
  return pathname.split("?")[0]?.replace(/\/+$/, "") || "/";
}

/** Accounting sidebar section should expand (Finance, Invoices, Proposals, etc.). */
function isAccountingNavOpen(pathname: string): boolean {
  const path = normalizeNavPath(pathname);
  if (path === "/account") return true;
  return isAccountingSidebarPath(pathname);
}

/** Routes under Accounting → Finance, Invoices, Proposals, etc. (not bare /account). */
function isAccountingSidebarPath(pathname: string): boolean {
  const path = normalizeNavPath(pathname);
  if (path === "/sales-invoices" || path.startsWith("/sales-invoices/")) return true;
  if (path === "/sales-proposals" || path.startsWith("/sales-proposals/")) return true;
  if (path === "/sales-proposal-templates" || path.startsWith("/sales-proposal-templates/")) return true;
  if (path === "/products" || path.startsWith("/products/")) return true;
  if (path === "/services" || path.startsWith("/services/")) return true;
  if (path === "/categories" || path.startsWith("/categories/")) return true;
  if (path === "/brands" || path.startsWith("/brands/")) return true;
  if (path === "/units" || path.startsWith("/units/")) return true;
  if (path === "/taxes" || path.startsWith("/taxes/")) return true;
  if (path.startsWith("/account/")) return true;
  return false;
}

/** Account dashboard home — only the bare /account route (not nested /account/* pages). */
function isAccountHomePath(pathname: string): boolean {
  const path = normalizeNavPath(pathname);
  return path === "/account";
}

/** Section "Dashboard" links that must not stay active on nested module routes. */
const MODULE_SECTION_HOME_HREFS = new Set([
  "/admin/event-platform",
  "/admin/venue-management",
]);

/** When multiple submenu links share a module home href, only this item stays active there. */
const MODULE_HOME_PRIMARY_NAV_NAME: Record<string, string> = {
  "/admin/venue-management": "venue-management-venues",
};

function isSubNavLinkActive(item: NavItem, pathname: string, siblings: NavItem[] = []): boolean {
  if (!item.href || item.href === "#") return false;
  const path = normalizeNavPath(pathname);
  const target = normalizeNavPath(item.href.split("?")[0] ?? item.href);

  if (path === target && MODULE_HOME_PRIMARY_NAV_NAME[target]) {
    const preferredName = MODULE_HOME_PRIMARY_NAV_NAME[target];
    const duplicates = siblings.filter(
      (sibling) => sibling.href && normalizeNavPath(sibling.href.split("?")[0] ?? sibling.href) === target,
    );
    if (duplicates.length > 1) {
      return item.name === preferredName;
    }
  }

  return isLinkActive(item.href, pathname);
}

function isLinkActive(href: string | undefined, pathname: string): boolean {
  if (!href || href === "#") return false;
  const path = normalizeNavPath(pathname);
  const target = normalizeNavPath(href.split("?")[0] ?? href);
  if (path === target) return true;
  if (path === "/dashboard" && target === "/account") return true;
  // Accounting submenu "Accounting" → /account: exact home only, not every /account/* child.
  if (target === "/account") return isAccountHomePath(pathname);
  if (target === "/launchpad") return false;
  // Event Platform / Venue "Dashboard" → exact home only, not every child route.
  if (MODULE_SECTION_HOME_HREFS.has(target)) return false;
  if (target.length > 1 && path.startsWith(`${target}/`)) return true;
  return false;
}

/** Whether a nav item (or any descendant) matches the current route / module scope. */
function isNavItemActive(item: NavItem, pathname: string, siblings: NavItem[] = []): boolean {
  if (item.href && isSubNavLinkActive(item, pathname, siblings)) return true;
  const scope = resolveDashboardScopeFromPath(pathname);
  if (scope && item.dashboardScope && item.dashboardScope.toLowerCase() === scope) {
    if (item.name === "accounting") return isAccountingNavOpen(pathname);
    if (item.name === "venue-management" && pathIsVenueManagementModuleHome(pathname)) return false;
    return true;
  }
  if (item.children?.length) {
    return item.children.some((child) => isNavItemActive(child, pathname, item.children));
  }
  return false;
}

function pathIsVenueManagementModuleHome(pathname: string): boolean {
  return normalizeNavPath(pathname) === "/admin/venue-management";
}

function useAutoExpandCollapsible(shouldBeOpen: boolean, pathname: string) {
  const [open, setOpen] = React.useState(shouldBeOpen);
  React.useEffect(() => {
    if (shouldBeOpen) setOpen(true);
  }, [shouldBeOpen, pathname]);
  return [open, setOpen] as const;
}

function CollapsibleMenuBranch({
  shouldBeOpen,
  pathname,
  children,
}: {
  shouldBeOpen: boolean;
  pathname: string;
  children: (props: { open: boolean; setOpen: (open: boolean) => void }) => React.ReactNode;
}) {
  const [open, setOpen] = useAutoExpandCollapsible(shouldBeOpen, pathname);
  return <>{children({ open, setOpen })}</>;
}

function subNavLabel(sub: NavItem, tt: (key: string) => string) {
  return sub.displayTitle?.trim() ? sub.displayTitle.trim() : tt(sub.title);
}

function DashboardRowMenu({
  tenantId,
  scope,
  displayLabel,
  triggerClassName,
}: {
  tenantId: string;
  scope: string;
  displayLabel: string;
  /** Merged onto the ⋮ trigger (e.g. hover-only visibility from parent `group/dashboard-row`). */
  triggerClassName?: string;
}) {
  const { t } = useTranslation();
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [nameInput, setNameInput] = React.useState(displayLabel);

  React.useEffect(() => {
    if (renameOpen) setNameInput(displayLabel);
  }, [renameOpen, displayLabel]);

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 shrink-0 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
              triggerClassName,
              (menuOpen || renameOpen) && "opacity-100 pointer-events-auto",
              !(menuOpen || renameOpen) &&
                "pointer-events-none group-hover/dashboard-row:pointer-events-auto group-focus-within/dashboard-row:pointer-events-auto",
            )}
            aria-label={t("Dashboard link options")}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>{t("Rename…")}</DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              patchDashboardPrefs(tenantId, { labels: { [scope]: "" } });
            }}
          >
            {t("Reset to default name")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>{t("Rename dashboard link")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor={`dash-rename-${scope}`}>{t("Display name")}</Label>
            <Input
              id={`dash-rename-${scope}`}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={displayLabel}
              autoComplete="off"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => {
                patchDashboardPrefs(tenantId, { labels: { [scope]: nameInput.trim() } });
                setRenameOpen(false);
              }}
            >
              {t("Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const LAUNCHPAD_SCOPE = "launchpad";

function dashboardSortableChildren(children: NavItem[]): NavItem[] {
  return children.filter((c) => c.dashboardScope && c.dashboardScope !== LAUNCHPAD_SCOPE);
}

function canUseDashboardDragReorder(children: NavItem[]): boolean {
  const sortable = dashboardSortableChildren(children);
  return sortable.length > 0 && sortable.every((c) => !c.children?.length);
}

/** Drag + ⋮ use `auto` width; `h-8` gives descenders room with `leading-snug` under `overflow-hidden`. */
const DASHBOARD_SUB_ROW_GRID =
  "grid h-8 w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-0.5";

function SortableDashboardRow({
  tenantId,
  subItem,
  pathname,
}: {
  tenantId: string;
  subItem: NavItem;
  pathname: string;
}) {
  const { t } = useTranslation();
  const scope = subItem.dashboardScope as string;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scope });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const subActive = isNavItemActive(subItem, pathname);
  const label = subNavLabel(subItem, t);

  const showControls = isDragging ? "opacity-100" : "opacity-0 group-hover/dashboard-row:opacity-100 group-focus-within/dashboard-row:opacity-100";

  return (
    <SidebarMenuSubItem
      ref={setNodeRef}
      style={style}
      className={cn("overflow-visible", isDragging && "relative z-[100] opacity-90")}
    >
      <div className={cn("group/dashboard-row", DASHBOARD_SUB_ROW_GRID)}>
        <div className="flex h-8 items-center justify-center">
          <button
            type="button"
            className={cn(
              "flex size-6 shrink-0 touch-none items-center justify-center rounded-sm text-muted-foreground outline-none transition-opacity duration-150",
              "cursor-grab hover:bg-sidebar-accent hover:text-foreground active:cursor-grabbing",
              showControls,
              !isDragging &&
                "pointer-events-none group-hover/dashboard-row:pointer-events-auto group-focus-within/dashboard-row:pointer-events-auto",
              isDragging && "pointer-events-auto",
            )}
            aria-label={t("Drag to reorder")}
            title={t("Drag to reorder")}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3 w-3" />
          </button>
        </div>
        <SidebarMenuSubButton
          asChild
          isActive={subActive}
          className="h-8 min-h-0 min-w-0 !translate-x-0 overflow-hidden py-0 [&>a]:flex [&>a]:h-8 [&>a]:min-h-0 [&>a]:min-w-0 [&>a]:max-w-full [&>a]:items-center [&>a]:gap-1 [&>a]:px-0.5 [&>a]:py-0"
        >
          <Link href={subItem.href ?? "#"} className="flex min-w-0 max-w-full items-center gap-1">
            {subItem.icon && <subItem.icon className="h-3 w-3 shrink-0 opacity-80" />}
            <span className="min-w-0 flex-1 truncate text-left leading-snug">{label}</span>
          </Link>
        </SidebarMenuSubButton>
        <div className="flex h-8 items-center justify-center">
          <DashboardRowMenu
            tenantId={tenantId}
            scope={scope}
            displayLabel={label}
            triggerClassName={cn(
              "transition-opacity duration-150",
              showControls,
              "data-[state=open]:opacity-100",
            )}
          />
        </div>
      </div>
    </SidebarMenuSubItem>
  );
}

function SortableDashboardList({
  tenantId,
  children,
  pathname,
}: {
  tenantId: string;
  children: NavItem[];
  pathname: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = React.useMemo(() => children.map((c) => c.dashboardScope as string), [children]);

  const onDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      const nextOrder = arrayMove(children, oldIndex, newIndex).map((c) => c.dashboardScope as string);
      patchDashboardPrefs(tenantId, { order: nextOrder });
    },
    [children, ids, tenantId],
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children.map((subItem) => (
          <SortableDashboardRow
            key={subItem.dashboardScope}
            tenantId={tenantId}
            subItem={subItem}
            pathname={pathname}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function NavSubMenuItem({
  subItem,
  pathname,
  siblings,
  isDashboardGroup,
  dashboardPrefsTenantId,
}: {
  subItem: NavItem;
  pathname: string;
  siblings: NavItem[];
  isDashboardGroup: boolean;
  dashboardPrefsTenantId: string | null;
}) {
  const { t } = useTranslation();
  const subShouldBeActive = isNavItemActive(subItem, pathname, siblings);

  if (subItem.children && subItem.children.length > 0) {
    return (
      <SidebarMenuSubItem key={subItem.title}>
        <CollapsibleMenuBranch shouldBeOpen={subShouldBeActive} pathname={pathname}>
          {({ open, setOpen }) => (
            <Collapsible
              asChild
              open={open}
              onOpenChange={setOpen}
              className="group/subcollapsible"
            >
              <div suppressHydrationWarning>
                <CollapsibleTrigger asChild>
                  <SidebarMenuSubButton isActive={subShouldBeActive}>
                    {subItem.icon && <subItem.icon className="h-4 w-4" />}
                    <span>{subNavLabel(subItem, t)}</span>
                    <ChevronDown className="ml-auto h-3 w-3 transition-transform group-data-[state=open]/subcollapsible:rotate-180" />
                  </SidebarMenuSubButton>
                </CollapsibleTrigger>
                <CollapsibleContent suppressHydrationWarning>
                  <SidebarMenuSub>
                    {subItem.children!.map((subSubItem) => (
                      <SidebarMenuSubItem key={subSubItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={isNavItemActive(subSubItem, pathname, subItem.children!)}
                          className="text-sm"
                        >
                          <Link href={subSubItem.href ?? "#"}>
                            {subSubItem.icon && <subSubItem.icon className="h-3 w-3" />}
                            <span>{subNavLabel(subSubItem, t)}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}
        </CollapsibleMenuBranch>
      </SidebarMenuSubItem>
    );
  }

  const label = subNavLabel(subItem, t);
  const scope = subItem.dashboardScope;

  return (
    <SidebarMenuSubItem className="overflow-visible">
      <div
        className={cn(
          "group/dashboard-row",
          isDashboardGroup && scope && dashboardPrefsTenantId
            ? DASHBOARD_SUB_ROW_GRID
            : "flex h-auto min-h-0 w-full min-w-0 items-center",
        )}
      >
        {isDashboardGroup && scope && dashboardPrefsTenantId ? (
          <span className="h-8 w-6 shrink-0" aria-hidden />
        ) : null}
        <SidebarMenuSubButton
          asChild
          isActive={subShouldBeActive}
          className={cn(
            "min-h-8 min-w-0 overflow-hidden !h-auto py-0",
            isDashboardGroup && scope && dashboardPrefsTenantId
              ? "!translate-x-0 h-8 min-h-0 [&>a]:flex [&>a]:h-8 [&>a]:min-h-0 [&>a]:min-w-0 [&>a]:max-w-full [&>a]:items-center [&>a]:gap-1 [&>a]:px-0.5 [&>a]:py-0"
              : "w-full flex-1 [&>a]:flex [&>a]:min-w-0 [&>a]:items-center [&>a]:gap-2 [&>a]:px-2",
          )}
        >
          <Link
            href={subItem.href ?? "#"}
            className={cn(
              "flex min-w-0 items-center gap-1",
              isDashboardGroup && scope && dashboardPrefsTenantId && "max-w-full",
            )}
          >
            {subItem.icon && (
              <subItem.icon
                className={cn(
                  "shrink-0",
                  isDashboardGroup && scope && dashboardPrefsTenantId ? "h-3 w-3 opacity-80" : "h-4 w-4",
                )}
              />
            )}
            <span
              className={cn(
                "min-w-0 flex-1 text-left",
                isDashboardGroup && scope && dashboardPrefsTenantId ? "truncate leading-snug" : "truncate",
              )}
            >
              {label}
            </span>
          </Link>
        </SidebarMenuSubButton>
        {isDashboardGroup && scope && dashboardPrefsTenantId ? (
          <div className="flex h-8 items-center justify-center">
            <DashboardRowMenu
              tenantId={dashboardPrefsTenantId}
              scope={scope}
              displayLabel={label}
              triggerClassName="transition-opacity duration-150 opacity-0 group-hover/dashboard-row:opacity-100 group-focus-within/dashboard-row:opacity-100 data-[state=open]:opacity-100"
            />
          </div>
        ) : null}
      </div>
    </SidebarMenuSubItem>
  );
}

export function NavMain({
  items = [],
  dashboardPrefsTenantId,
}: {
  items: NavItem[];
  /** Company tenant for sidebar prefs; null until `/api/auth/me` resolves (no drag/rename until set). */
  dashboardPrefsTenantId: string | null;
}) {
  const pathname = usePathname() ?? "";
  const { t } = useTranslation();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const shouldBeActive = isNavItemActive(item, pathname);
          const isDashboardGroup = item.name === "dashboard";

          if (item.children && item.children.length > 0) {
            return (
              <SidebarMenuItem key={item.title}>
                <CollapsibleMenuBranch shouldBeOpen={shouldBeActive} pathname={pathname}>
                  {({ open, setOpen }) => (
                    <Collapsible
                      asChild
                      open={open}
                      onOpenChange={setOpen}
                      className="group/collapsible group-data-[collapsible=icon]:hidden"
                    >
                      <div suppressHydrationWarning>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={t(item.title)} isActive={shouldBeActive}>
                            {item.icon && <item.icon />}
                            <span>{t(item.title)}</span>
                            <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent suppressHydrationWarning>
                          <SidebarMenuSub
                            className={
                              isDashboardGroup
                                ? "mx-1 gap-0 border-l-0 px-0.5 py-0 translate-x-0"
                                : undefined
                            }
                          >
                            {isDashboardGroup &&
                            item.children &&
                            canUseDashboardDragReorder(item.children) &&
                            dashboardPrefsTenantId ? (
                              <>
                                {item.children
                                  .filter((c) => c.dashboardScope === LAUNCHPAD_SCOPE)
                                  .map((subItem) => {
                                    const subActive = isNavItemActive(subItem, pathname);
                                    const label = subNavLabel(subItem, t);
                                    return (
                                      <SidebarMenuSubItem
                                        key={subItem.name ?? subItem.href ?? subItem.title}
                                        className="overflow-visible"
                                      >
                                        <SidebarMenuSubButton asChild isActive={subActive} className="w-full">
                                          <Link href={subItem.href ?? "#"} className="flex min-w-0 items-center gap-2 px-2">
                                            {subItem.icon && <subItem.icon className="h-4 w-4 shrink-0" />}
                                            <span className="truncate">{label}</span>
                                          </Link>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    );
                                  })}
                                <SortableDashboardList
                                  tenantId={dashboardPrefsTenantId}
                                  children={dashboardSortableChildren(item.children)}
                                  pathname={pathname}
                                />
                              </>
                            ) : (
                              item.children!.map((subItem) => (
                                <NavSubMenuItem
                                  key={subItem.name ?? subItem.href ?? subItem.title}
                                  subItem={subItem}
                                  pathname={pathname}
                                  siblings={item.children!}
                                  isDashboardGroup={isDashboardGroup}
                                  dashboardPrefsTenantId={dashboardPrefsTenantId}
                                />
                              ))
                            )}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  )}
                </CollapsibleMenuBranch>

                <div className="hidden group-data-[collapsible=icon]:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton tooltip={t(item.title)} isActive={shouldBeActive}>
                        {item.icon && <item.icon />}
                        <span>{t(item.title)}</span>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-52">
                      {item.children.map((subItem) => (
                        <DropdownMenuItem key={subItem.name ?? subItem.href ?? subItem.title} asChild>
                          <Link href={subItem.href ?? "#"} className="flex items-center gap-2">
                            {subItem.icon && <subItem.icon className="h-4 w-4" />}
                            <span className="truncate">{subNavLabel(subItem, t)}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </SidebarMenuItem>
            );
          }

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={shouldBeActive} tooltip={t(item.title)}>
                <Link href={item.href ?? "#"}>
                  {item.icon && <item.icon />}
                  <span>{t(item.title)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
