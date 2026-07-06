"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Shield, LayoutGrid, List, Edit, Trash2 } from "lucide-react";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { t } from "@/lib/admin-t";


interface Role {
  id: string;
  name: string;
  label: string;
  editable: boolean;
  /** Server-computed: whether this actor may edit permissions. */
  canEdit?: boolean;
  systemRole?: boolean;
  permissionsCount: number;
  users: { id: string; name: string }[];
}

interface Permission {
  id: string;
  name: string;
  label: string;
  module: string;
  addOn: string;
}

type GroupedPerms = Record<string, Record<string, Permission[]>>;

function groupByAddOnModule(perms: Permission[]): GroupedPerms {
  const result: GroupedPerms = {};
  for (const p of perms) {
    if (!result[p.addOn]) result[p.addOn] = {};
    if (!result[p.addOn][p.module]) result[p.addOn][p.module] = [];
    result[p.addOn][p.module].push(p);
  }
  return result;
}

// ──────────────────────────────────────────────────────────────────────────────
// Role Drawer (Create / Edit)
// ──────────────────────────────────────────────────────────────────────────────
function RoleDrawer({
  open, onClose, role, onSaved,
}: {
  open: boolean; onClose: () => void; role: Role | null; onSaved: () => void;
}) {
  const [name, setName]       = useState("");
  const [label, setLabel]     = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [addOnSearch, setAddOnSearch] = useState("");
  const [canEdit, setCanEdit] = useState(true);
  const [readOnlyHint, setReadOnlyHint] = useState<string | null>(null);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  const grouped = useMemo(() => groupByAddOnModule(allPerms), [allPerms]);
  const addOns  = useMemo(() => Object.keys(grouped), [grouped]);
  const filteredAddOns = useMemo(
    () => addOns.filter((a) => a.toLowerCase().includes(addOnSearch.toLowerCase())),
    [addOns, addOnSearch],
  );

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j: { role?: string; roles?: string[] }) => {
        const roles = Array.isArray(j.roles) ? j.roles : [];
        setIsSuperadmin(j.role === "superadmin" || roles.includes("superadmin"));
      })
      .catch(() => setIsSuperadmin(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setAddOnSearch("");
    Promise.all([
      fetch("/api/user-management/permissions").then((r) => r.json()),
      role ? fetch(`/api/user-management/roles/${role.id}`).then((r) => r.json()) : Promise.resolve(null),
    ]).then(([permsData, roleData]) => {
      setAllPerms(permsData.data ?? []);
      if (roleData?.data) {
        setName(roleData.data.name);
        setLabel(roleData.data.label);
        setSelected(new Set(roleData.data.permissionIds ?? []));
        const editable = roleData.data.canEdit !== false;
        setCanEdit(editable);
        if (!editable && roleData.data.systemRole) {
          setReadOnlyHint(
            isSuperadmin
              ? null
              : t(
                  "Shared system roles cannot be edited here. Use Create Role to define custom permissions for your team, then assign that role to users.",
                ),
          );
        } else if (editable && isSuperadmin && roleData.data.systemRole) {
          setReadOnlyHint(
            t("Platform role — permission changes apply to all organizations using this template."),
          );
        } else {
          setReadOnlyHint(null);
        }
      } else {
        setName("");
        setLabel("");
        setSelected(new Set());
        setCanEdit(true);
        setReadOnlyHint(null);
      }
    }).catch(() => toast.error("Failed to load data")).finally(() => setLoading(false));
  }, [open, role, isSuperadmin]);

  const toggle = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n; });
  }, []);

  const toggleMany = (ids: string[], checked: boolean) =>
    ids.forEach((id) => toggle(id, checked));

  const moduleState = (ids: string[]) => {
    const cnt = ids.filter((id) => selected.has(id)).length;
    if (cnt === 0) return { checked: false, indeterminate: false };
    if (cnt === ids.length) return { checked: true, indeterminate: false };
    return { checked: false, indeterminate: true };
  };

  const addOnState = (addOn: string) => {
    const ids = Object.values(grouped[addOn] ?? {}).flat().map((p) => p.id);
    return moduleState(ids);
  };

  const readOnly = Boolean(role && !canEdit);

  const handleSave = async () => {
    if (readOnly) return;
    if (!label.trim()) { toast.error("Label is required"); return; }
    if (!role && !name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const url = role ? `/api/user-management/roles/${role.id}` : "/api/user-management/roles";
      const method = role ? "PATCH" : "POST";
      const body: any = { label: label.trim(), permissionIds: Array.from(selected) };
      if (!role) body.name = name.trim();
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to save"); return; }
      toast.success(role ? "Role updated" : "Role created");
      onSaved(); onClose();
    } catch { toast.error("Network error"); } finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>
            {role ? (readOnly ? t("View Role") : t("Edit Role")) : t("Create Role")}
          </SheetTitle>
          {readOnlyHint ? (
            <p className="text-sm text-muted-foreground">{readOnlyHint}</p>
          ) : readOnly ? (
            <p className="text-sm text-muted-foreground">
              {t("You do not have permission to edit this role.")}
            </p>
          ) : null}
        </SheetHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading…</div>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-5 space-y-6">
              {/* Name + Label */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{t("Name")}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. sales-manager" disabled={!!role} />
                  {!role && <p className="text-xs text-muted-foreground">Lowercase, hyphens only</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Label")}</Label>
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Sales Manager" disabled={readOnly} />
                </div>
              </div>

              {/* Add-on search */}
              <div className="space-y-3">
                <Input
                  placeholder={t("Search add-ons...")}
                  value={addOnSearch}
                  onChange={(e) => setAddOnSearch(e.target.value)}
                  className="max-w-sm"
                />

                <Label>{t("Permissions")} <span className="text-muted-foreground font-normal">({selected.size} selected)</span></Label>

                {filteredAddOns.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No add-ons found</p>
                ) : (
                  <Tabs defaultValue={filteredAddOns[0]} key={filteredAddOns[0]}>
                    <TabsList className="mb-3 w-full justify-start overflow-x-auto overflow-y-hidden h-auto p-1 flex-wrap gap-1">
                      {filteredAddOns.map((addOn) => {
                        const st = addOnState(addOn);
                        const allIds = Object.values(grouped[addOn] ?? {}).flat().map((p) => p.id);
                        const selectedCount = allIds.filter((id) => selected.has(id)).length;
                        return (
                          <TabsTrigger key={addOn} value={addOn} className="capitalize whitespace-nowrap flex-shrink-0 gap-1.5">
                            {addOn}
                            {selectedCount > 0 && (
                              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground">
                                {selectedCount}
                              </span>
                            )}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    {filteredAddOns.map((addOn) => {
                      const modules = grouped[addOn] ?? {};
                      const allAddOnIds = Object.values(modules).flat().map((p) => p.id);
                      const addOnSt = moduleState(allAddOnIds);
                      return (
                        <TabsContent key={addOn} value={addOn}>
                          {/* Add-on level select-all */}
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                            <Checkbox
                              checked={addOnSt.checked}
                              ref={(el) => { if (el) (el as any).indeterminate = addOnSt.indeterminate; }}
                              onCheckedChange={(v) => toggleMany(allAddOnIds, !!v)}
                              disabled={readOnly}
                            />
                            <span className="text-sm font-semibold">Select all {addOn} permissions</span>
                          </div>

                          <div className="space-y-3">
                            {Object.entries(modules).map(([module, perms]) => {
                              const modIds = perms.map((p) => p.id);
                              const modSt = moduleState(modIds);
                              return (
                                <div key={module} className="border rounded p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Checkbox
                                      id={`mod-${module}`}
                                      checked={modSt.checked}
                                      ref={(el) => { if (el) (el as any).indeterminate = modSt.indeterminate; }}
                                      onCheckedChange={(v) => toggleMany(modIds, !!v)}
                                      disabled={readOnly}
                                    />
                                    <Label htmlFor={`mod-${module}`} className="font-medium capitalize cursor-pointer">
                                      {module}
                                    </Label>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    {perms.map((p) => (
                                      <div key={p.id} className="flex items-center gap-2">
                                        <Checkbox
                                          id={p.id}
                                          checked={selected.has(p.id)}
                                          onCheckedChange={(v) => toggle(p.id, !!v)}
                                          disabled={readOnly}
                                        />
                                        <Label htmlFor={p.id} className="text-sm cursor-pointer font-normal">{p.label}</Label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                )}
              </div>
            </div>
          </ScrollArea>
        )}

        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>{readOnly ? t("Close") : t("Cancel")}</Button>
          {!readOnly && (
            <Button onClick={handleSave} disabled={saving || loading}>{saving ? t("Saving…") : t("Save")}</Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Delete dialog
// ──────────────────────────────────────────────────────────────────────────────
function DeleteRoleDialog({ role, open, onClose, onDeleted }: {
  role: Role | null; open: boolean; onClose: () => void; onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const handleDelete = async () => {
    if (!role) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/user-management/roles/${role.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to delete"); return; }
      toast.success("Role deleted"); onDeleted(); onClose();
    } catch { toast.error("Network error"); } finally { setLoading(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{t("Delete Role")}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{role?.label}</strong>? This cannot be undone.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>{t("Cancel")}</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>{loading ? t("Deleting…") : t("Delete")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// User avatar initials bubble
// ──────────────────────────────────────────────────────────────────────────────
function UserBubble({ name, tooltip = true }: { name: string; tooltip?: boolean }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const bubble = (
    <div className="h-8 w-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-[10px] font-semibold text-primary flex-shrink-0">
      {initials}
    </div>
  );
  if (!tooltip) return bubble;
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{bubble}</TooltipTrigger>
        <TooltipContent><p>{name}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────────
export default function UserManagementRoles() {
  const [roles, setRoles]         = useState<Role[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [perPage, setPerPage]     = useState(10);
  const [search, setSearch]       = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading]     = useState(true);
  const [viewMode, setViewMode]   = useState<"list" | "grid">("list");

  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole]     = useState<Role | null>(null);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);

  const syncSystemRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/user-management/seed-portal-roles", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to sync system roles");
        return;
      }
      toast.success(data.message ?? "System roles synced");
    } catch {
      toast.error("Failed to sync system roles");
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      if (search) params.set("search", search);
      const res = await fetch(`/api/user-management/roles?${params}`);
      const data = await res.json();
      setRoles(data.data ?? []); setTotal(data.total ?? 0);
    } catch { toast.error("Failed to load roles"); } finally { setLoading(false); }
  }, [page, perPage, search]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={async () => { await syncSystemRoles(); fetchRoles(); }}>
          {t("Sync system roles")}
        </Button>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> {t("Create Role")}
        </Button>
      </div>

      <Card className="shadow-sm">
        {/* Search + controls */}
        <CardContent className="p-4 border-b bg-gray-50/50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={t("Search roles...")}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
                />
              </div>
              <Button onClick={() => { setSearch(searchInput); setPage(1); }}>{t("Search")}</Button>
            </div>
            <div className="flex items-center gap-2">
              {/* Per-page */}
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
              {/* Grid/List toggle */}
              <div className="flex rounded-md border overflow-hidden">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Content: List or Grid */}
        <CardContent className="p-0">
          {viewMode === "list" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">{t("Name")} ↕</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">{t("Label")} ↕</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">{t("Permissions")}</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">{t("Users")}</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>
                  ) : roles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center">
                        <Shield className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-muted-foreground">{t("No roles found")}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">{t("Get started by creating your first role.")}</p>
                      </td>
                    </tr>
                  ) : roles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{role.name}</td>
                      <td className="px-4 py-3 text-gray-700">{role.label}</td>
                      <td className="px-4 py-3">
                        <button
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                          onClick={() => setEditRole(role)}
                        >
                          {role.permissionsCount}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {role.users.length === 0 ? (
                          <span className="text-muted-foreground text-sm">{t("No users")}</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {role.users.slice(0, 5).map((u) => (
                              <span key={u.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
                                {u.name}
                              </span>
                            ))}
                            {role.users.length > 5 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                                +{role.users.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <TableActionButton
                          label={role.canEdit !== false ? "Edit" : "View"}
                          onPrimaryClick={() => setEditRole(role)}
                          items={[
                            ...(role.canEdit !== false && !role.systemRole
                              ? [{ label: "Delete", onSelect: () => setDeleteRole(role), destructive: true as const }]
                              : []),
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid view */
            <div className="p-6">
              {loading ? (
                <p className="text-center text-muted-foreground py-10">Loading…</p>
              ) : roles.length === 0 ? (
                <div className="text-center py-16">
                  <Shield className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-muted-foreground">{t("No roles found")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {roles.map((role) => (
                    <Card key={role.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Shield className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="font-semibold text-base text-gray-900 leading-tight">{role.label}</h3>
                          </div>
                          <div className="flex gap-1">
                            <TooltipProvider>
                              <Tooltip delayDuration={300}>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600" onClick={() => setEditRole(role)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{t("Edit")}</p></TooltipContent>
                              </Tooltip>
                              {role.canEdit !== false && !role.systemRole && (
                                <Tooltip delayDuration={300}>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => setDeleteRole(role)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>{t("Delete")}</p></TooltipContent>
                                </Tooltip>
                              )}
                            </TooltipProvider>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-600">{t("Permissions")}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              {role.permissionsCount}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-2">{t("Users")}</p>
                            {role.users.length === 0 ? (
                              <span className="text-xs text-muted-foreground">{t("No users")}</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <div className="flex -space-x-2">
                                  {role.users.slice(0, 4).map((u) => <UserBubble key={u.id} name={u.name} />)}
                                </div>
                                {role.users.length > 4 && (
                                  <div className="h-8 w-8 rounded-full bg-gray-200 border-2 border-background flex items-center justify-center text-xs text-gray-600 font-medium">
                                    +{role.users.length - 4}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Pagination footer */}
        <CardContent className="px-4 py-3 border-t bg-gray-50/30">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {total === 0
                ? "No results"
                : `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, total)} of ${total} results`}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("Previous")}</Button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 3, totalPages - 6)) + i;
                return p <= totalPages ? (
                  <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)}>{p}</Button>
                ) : null;
              })}
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t("Next")}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drawers & Dialogs */}
      <RoleDrawer open={createOpen} onClose={() => setCreateOpen(false)} role={null} onSaved={fetchRoles} />
      <RoleDrawer open={!!editRole} onClose={() => setEditRole(null)} role={editRole} onSaved={fetchRoles} />
      <DeleteRoleDialog role={deleteRole} open={!!deleteRole} onClose={() => setDeleteRole(null)} onDeleted={fetchRoles} />
    </div>
  );
}
