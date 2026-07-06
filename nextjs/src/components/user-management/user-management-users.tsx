"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search } from "lucide-react";
import { TableActionButton } from "@/components/ui/table-action-button";
import { TableColumnVisibilityMenu } from "@/components/ui/table-column-visibility-menu";
import { useTableColumnVisibility } from "@/hooks/use-table-column-visibility";
import { useTranslation } from "@/contexts/translation-context";
import { combineDisplayName, splitDisplayName } from "@/lib/display-name";
import { toast } from "sonner";

const USER_MGMT_COLUMN_STORAGE_KEY = "pf-user-management-users-table-columns-v1";

type UserMgmtColumnId = "name" | "email" | "role" | "status";

const DEFAULT_USER_MGMT_COLUMNS: Record<UserMgmtColumnId, boolean> = {
  name: true,
  email: true,
  role: true,
  status: true,
};

const USER_MGMT_COLUMN_ORDER: UserMgmtColumnId[] = ["name", "email", "role", "status"];

interface UserRow {
  id: string;
  name: string;
  email: string;
  type: string;
  status: string;
  roles: { id: string; name: string; label: string }[];
}

interface Role {
  id: string;
  name: string;
  label: string;
  permissionsCount: number;
  users: { id: string; name: string }[];
}

function UserFormDrawer({
  open,
  onClose,
  user,
  roles,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  user: UserRow | null;
  roles: Role[];
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("__none__");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const { firstName: fn, lastName: ln } = splitDisplayName(user?.name);
      setFirstName(fn);
      setLastName(ln);
      setEmail(user?.email ?? "");
      setPassword("");
      setRoleId(user?.roles?.[0]?.id ?? "__none__");
    }
  }, [open, user]);

  const handleSave = async () => {
    const name = combineDisplayName(firstName, lastName);
    if (!firstName.trim() || !email.trim()) {
      toast.error(t("First name and email are required"));
      return;
    }
    if (!user && password.trim().length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSaving(true);
    try {
      const url = user ? `/api/user-management/users/${user.id}` : "/api/user-management/users";
      const method = user ? "PATCH" : "POST";
      const body: Record<string, unknown> = {
        name,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        roleId: roleId === "__none__" ? null : roleId,
      };
      if (password.trim()) body.password = password.trim();
      if (!user) {
        body.password = password.trim();
        body.send_welcome_email = true;
      }

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to save"); return; }
      if (!user) {
        if (data.welcome_email_sent === false && data.welcome_email_error) {
          toast.warning(`${t("User created, but welcome email could not be sent:")} ${data.welcome_email_error}`);
        } else {
          toast.success(t("User created. Welcome email sent with login details."));
        }
      } else {
        toast.success(t("User updated"));
      }
      onSaved();
      onClose();
    } catch { toast.error("Network error"); } finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{user ? t("Edit User") : t("Create User")}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  {t("First Name")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t("First name")}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Last Name")}</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t("Last name")}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Email")} <span className="text-red-500">*</span></Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>
                {user ? t("New Password") : t("Password")}
                {!user && <span className="text-red-500"> *</span>}
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={user ? "Leave blank to keep current" : "Min 6 characters"}
              />
              {!user ? (
                <p className="text-xs text-muted-foreground">
                  {t("A welcome email with these login details is sent using your Email Settings (New User template).")}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>{t("Role")}</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— No role —</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>{t("Cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? t("Saving…") : t("Save")}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DeleteUserDialog({ user, open, onClose, onDeleted }: { user: UserRow | null; open: boolean; onClose: () => void; onDeleted: () => void }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const handleDelete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/user-management/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to delete"); return; }
      toast.success("User deleted");
      onDeleted();
      onClose();
    } catch { toast.error("Network error"); } finally { setLoading(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{t("Delete User")}</DialogTitle></DialogHeader>
        <p className="text-sm text-gray-600">Are you sure you want to delete <strong>{user?.name}</strong>? This action cannot be undone.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>{t("Cancel")}</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>{loading ? t("Deleting…") : t("Delete")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UserManagementUsers({ initialSearch = "" }: { initialSearch?: string }) {
  const { t } = useTranslation();
  const { columnVisible, setVisibility, resetVisibility, visibleDataColumnCount } =
    useTableColumnVisibility<UserMgmtColumnId>(USER_MGMT_COLUMN_STORAGE_KEY, DEFAULT_USER_MGMT_COLUMNS);

  const userColumnMenuDefs = useMemo(
    () => [
      { id: "name" as const, label: t("Name") },
      { id: "email" as const, label: t("Email") },
      { id: "role" as const, label: t("Role") },
      { id: "status" as const, label: t("Status") },
    ],
    [t],
  );

  const listColSpan = visibleDataColumnCount(USER_MGMT_COLUMN_ORDER);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 10;
  const [search, setSearch] = useState(initialSearch);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      if (search) params.set("search", search);
      const res = await fetch(`/api/user-management/users?${params}`);
      const data = await res.json();
      setUsers(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch { toast.error("Failed to load users"); } finally { setLoading(false); }
  }, [page, search]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/user-management/roles?page=1&per_page=100");
      const data = await res.json();
      setRoles(data.data ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <TableColumnVisibilityMenu
          columns={userColumnMenuDefs}
          columnVisible={columnVisible}
          setVisibility={setVisibility}
          onReset={resetVisibility}
        />
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> {t("Create User")}
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder={t("Search users...")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
          />
        </div>
        <Button onClick={() => { setSearch(searchInput); setPage(1); }}>{t("Search")}</Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {columnVisible("name") ? (
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("Name")} ↕</th>
              ) : null}
              {columnVisible("email") ? (
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("Email")}</th>
              ) : null}
              {columnVisible("role") ? (
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("Role")}</th>
              ) : null}
              {columnVisible("status") ? (
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t("Status")}</th>
              ) : null}
              <th className="px-4 py-3 text-right font-medium text-gray-600">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={listColSpan} className="px-4 py-10 text-center text-gray-400">
                  {t("Loading…")}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={listColSpan} className="px-4 py-10 text-center text-gray-400">
                  {t("No users found")}
                </td>
              </tr>
            ) : users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                {columnVisible("name") ? (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{user.name || "—"}</span>
                    </div>
                  </td>
                ) : null}
                {columnVisible("email") ? <td className="px-4 py-3 text-gray-600">{user.email}</td> : null}
                {columnVisible("role") ? (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : user.roles.map((r) => (
                        <span
                          key={r.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-700 border border-purple-100"
                        >
                          {r.label}
                        </span>
                      ))}
                    </div>
                  </td>
                ) : null}
                {columnVisible("status") ? (
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {user.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                ) : null}
                <td className="px-4 py-3 text-right">
                  <TableActionButton
                    label="Edit"
                    onPrimaryClick={() => setEditUser(user)}
                    items={[
                      { label: "Delete", onSelect: () => setDeleteUser(user), destructive: true },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {total === 0 ? "No results" : `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, total)} of ${total} results`}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("Previous")}</Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map((p) => (
            <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)}>{p}</Button>
          ))}
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t("Next")}</Button>
        </div>
      </div>

      {/* Drawers & Dialogs */}
      <UserFormDrawer open={createOpen} onClose={() => setCreateOpen(false)} user={null} roles={roles} onSaved={fetchUsers} />
      <UserFormDrawer open={!!editUser} onClose={() => setEditUser(null)} user={editUser} roles={roles} onSaved={fetchUsers} />
      <DeleteUserDialog user={deleteUser} open={!!deleteUser} onClose={() => setDeleteUser(null)} onDeleted={fetchUsers} />
    </div>
  );
}
