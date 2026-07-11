"use client";

import * as React from "react";
import { format } from "date-fns";
import { Copy, Loader2, Mail, Plus, Search, UserRound } from "lucide-react";
import { toast } from "sonner";

import NoRecordsFound from "@/components/no-records-found";
import { Button } from "@/components/ui/button";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { EventHostDto, EventHostInvitationDto } from "@/lib/event-platform/hosts/host-types";
import { splitEventHostDisplayName } from "@/lib/event-platform/hosts/host-display-name";
import { appConfirm } from "@/lib/app-confirm";
import { formatPhone, formatPhoneDisplay, normalizeMobileForStorage } from "@/lib/phone";
import { cn } from "@/lib/utils";

type EventOption = { id: string; title: string; startsAt: string };

const emptyHostForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  bio: "",
  imageUrl: "",
  status: "active",
};

function hostFormFromDto(host: EventHostDto) {
  const personName = splitEventHostDisplayName(host.displayName);
  return {
    firstName: host.firstName?.trim() || personName.firstName,
    lastName: host.lastName?.trim() || personName.lastName,
    email: host.email,
    phone: formatPhone(host.phone ?? ""),
    bio: host.bio ?? "",
    imageUrl: host.imageUrl ?? "",
    status: host.status,
  };
}

function inviteStatusClass(status: string) {
  const s = status.toLowerCase();
  if (s === "accepted") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (s === "pending") return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  if (s === "declined" || s === "revoked" || s === "expired") {
    return "bg-red-500/15 text-red-700 dark:text-red-400";
  }
  return "bg-muted text-muted-foreground";
}

export function EventPlatformHostsAdmin() {
  const [hosts, setHosts] = React.useState<EventHostDto[] | null>(null);
  const [invitations, setInvitations] = React.useState<EventHostInvitationDto[] | null>(null);
  const [search, setSearch] = React.useState("");
  const [inviteFilter, setInviteFilter] = React.useState("all");
  const [hostSheetOpen, setHostSheetOpen] = React.useState(false);
  const [inviteSheetOpen, setInviteSheetOpen] = React.useState(false);
  const [editingHostId, setEditingHostId] = React.useState<string | null>(null);
  const [inviteHostId, setInviteHostId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [events, setEvents] = React.useState<EventOption[]>([]);
  const [eventsLoading, setEventsLoading] = React.useState(false);
  const [hostForm, setHostForm] = React.useState(emptyHostForm);
  const [inviteForm, setInviteForm] = React.useState({ eventId: "", message: "" });

  const reload = React.useCallback(async () => {
    const res = await fetch("/api/event-platform/hosts", { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      items?: EventHostDto[];
      invitations?: EventHostInvitationDto[];
      message?: string;
    } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not load hosts.");
      setHosts([]);
      setInvitations([]);
      return;
    }
    setHosts(data.items ?? []);
    setInvitations(data.invitations ?? []);
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const filteredHosts = React.useMemo(() => {
    if (!hosts) return [];
    const q = search.trim().toLowerCase();
    if (!q) return hosts;
    return hosts.filter(
      (h) =>
        h.displayName.toLowerCase().includes(q) ||
        (h.firstName ?? "").toLowerCase().includes(q) ||
        (h.lastName ?? "").toLowerCase().includes(q) ||
        h.email.toLowerCase().includes(q) ||
        (h.phone ?? "").toLowerCase().includes(q),
    );
  }, [hosts, search]);

  const filteredInvites = React.useMemo(() => {
    if (!invitations) return [];
    return invitations.filter((inv) => inviteFilter === "all" || inv.status === inviteFilter);
  }, [invitations, inviteFilter]);

  function openCreateHost() {
    setEditingHostId(null);
    setHostForm(emptyHostForm);
    setHostSheetOpen(true);
  }

  function openEditHost(host: EventHostDto) {
    setEditingHostId(host.id);
    setHostForm(hostFormFromDto(host));
    setHostSheetOpen(true);
  }

  async function loadEvents() {
    setEventsLoading(true);
    try {
      const res = await fetch("/api/lms/admin/events", { credentials: "include", cache: "no-store" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        events?: Array<{ id: string; title: string; startsAt: string }>;
      } | null;
      if (res.ok && data?.ok && Array.isArray(data.events)) {
        setEvents(
          data.events
            .map((e) => ({ id: e.id, title: e.title, startsAt: e.startsAt }))
            .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()),
        );
      }
    } finally {
      setEventsLoading(false);
    }
  }

  async function openInvite(host: EventHostDto) {
    setInviteHostId(host.id);
    setInviteForm({ eventId: "", message: "" });
    setInviteSheetOpen(true);
    if (events.length === 0) await loadEvents();
  }

  async function saveHost() {
    setSaving(true);
    try {
      const url = editingHostId ? `/api/event-platform/hosts/${editingHostId}` : "/api/event-platform/hosts";
      const method = editingHostId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...hostForm,
          phone: normalizeMobileForStorage(hostForm.phone),
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not save host.");
        return;
      }
      toast.success(editingHostId ? "Host updated." : "Host created.");
      setHostSheetOpen(false);
      await reload();
    } finally {
      setSaving(false);
    }
  }

  async function sendInvite() {
    if (!inviteHostId || !inviteForm.eventId) {
      toast.error("Select an event.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/event-platform/hosts/${inviteHostId}/invite`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        email?: { ok?: boolean; message?: string; devLink?: string };
        invitation?: EventHostInvitationDto;
      } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not send invitation.");
        return;
      }
      if (data.email?.devLink) {
        toast.success(
          data.email.message ??
            "Invitation created. Copy the invite link from the Invitations tab (email was not sent).",
        );
      } else if (data.email?.ok) {
        toast.success(data.email.message ?? "Invitation sent.");
      } else {
        toast.warning(
          data.email?.message ??
            "Invitation created. Copy the invite link from the Invitations tab — email was not sent.",
        );
      }
      setInviteSheetOpen(false);
      await reload();
    } finally {
      setSaving(false);
    }
  }

  async function revokeInvite(id: string) {
    const res = await fetch(`/api/event-platform/host-invitations/${id}/revoke`, {
      method: "POST",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not revoke invitation.");
      return;
    }
    toast.success("Invitation revoked.");
    await reload();
  }

  function copyInviteLink(url: string) {
    void navigator.clipboard.writeText(url);
    toast.success("Invite link copied.");
  }

  async function archiveHost(id: string) {
    const res = await fetch(`/api/event-platform/hosts/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not archive host.");
      return;
    }
    toast.success("Host archived.");
    await reload();
  }

  async function deleteHost(host: EventHostDto) {
    const confirmed = await appConfirm({
      title: "Delete host",
      description: `Permanently delete "${host.displayName}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;

    const res = await fetch(`/api/event-platform/hosts/${host.id}?permanent=1`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not delete host.");
      return;
    }
    toast.success("Host deleted.");
    await reload();
  }

  function hostRowActions(host: EventHostDto) {
    const items: TableActionItem[] = [
      {
        label: "Invite",
        icon: <Mail className="h-4 w-4" />,
        onSelect: () => void openInvite(host),
      },
    ];
    if (host.status === "active") {
      items.push({ label: "Archive", onSelect: () => void archiveHost(host.id) });
    }
    items.push({
      label: "Delete",
      onSelect: () => void deleteHost(host),
      destructive: true,
    });
    return {
      label: "Edit",
      onPrimaryClick: () => openEditHost(host),
      items,
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hosts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage event hosts, send invitations, and track accept or decline responses.
          </p>
        </div>
        <Button onClick={openCreateHost} className="gap-2">
          <Plus className="h-4 w-4" />
          Add host
        </Button>
      </div>

      <Tabs defaultValue="hosts">
        <TabsList>
          <TabsTrigger value="hosts">Hosts</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="hosts" className="mt-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search hosts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="rounded-xl border bg-card shadow-sm">
            {hosts === null ? (
              <div className="flex items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading hosts…
              </div>
            ) : filteredHosts.length === 0 ? (
              <NoRecordsFound
                icon={UserRound}
                title="No hosts yet"
                description="Add a host to start sending event invitations."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Host</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Accepted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHosts.map((host) => (
                    <TableRow key={host.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                            <UserRound className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium">{host.displayName}</p>
                            <p className="truncate text-xs text-muted-foreground">{host.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatPhoneDisplay(host.phone, "—")}</TableCell>
                      <TableCell>{host.pendingInvites}</TableCell>
                      <TableCell>{host.acceptedInvites}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                            host.status === "active"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {host.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <TableActionButton {...hostRowActions(host)} className="ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="invitations" className="mt-4 space-y-4">
          <Select value={inviteFilter} onValueChange={setInviteFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>

          <div className="rounded-xl border bg-card shadow-sm">
            {invitations === null ? (
              <div className="flex items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading invitations…
              </div>
            ) : filteredInvites.length === 0 ? (
              <NoRecordsFound icon={Mail} title="No invitations yet" description="Invite a host to an event from the Hosts tab." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Host</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Event date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvites.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{inv.hostName}</p>
                          <p className="text-xs text-muted-foreground">{inv.hostEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>{inv.eventTitle}</TableCell>
                      <TableCell>{format(new Date(inv.eventStartsAt), "MMM d, yyyy h:mm a")}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                            inviteStatusClass(inv.status),
                          )}
                        >
                          {inv.status}
                        </span>
                      </TableCell>
                      <TableCell>{format(new Date(inv.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <TableActionButton
                          label="Copy link"
                          primaryIcon={<Copy className="h-4 w-4" />}
                          onPrimaryClick={() => copyInviteLink(inv.inviteUrl)}
                          items={
                            inv.status === "pending"
                              ? ([
                                  {
                                    label: "Revoke",
                                    onSelect: () => void revokeInvite(inv.id),
                                    destructive: true,
                                  },
                                ] satisfies TableActionItem[])
                              : []
                          }
                          className="ml-auto"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={hostSheetOpen} onOpenChange={setHostSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingHostId ? "Edit host" : "Add host"}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="host-first-name">First name</Label>
                <Input
                  id="host-first-name"
                  value={hostForm.firstName}
                  onChange={(e) => setHostForm((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="Jordan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host-last-name">Last name</Label>
                <Input
                  id="host-last-name"
                  value={hostForm.lastName}
                  onChange={(e) => setHostForm((f) => ({ ...f, lastName: e.target.value }))}
                  placeholder="Reyes"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="host-email">Email</Label>
              <Input
                id="host-email"
                type="email"
                value={hostForm.email}
                onChange={(e) => setHostForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="host-phone">Phone</Label>
              <Input
                id="host-phone"
                value={hostForm.phone}
                onChange={(e) => setHostForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))}
                placeholder="(000) 000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="host-bio">Bio</Label>
              <Textarea
                id="host-bio"
                rows={4}
                value={hostForm.bio}
                onChange={(e) => setHostForm((f) => ({ ...f, bio: e.target.value }))}
              />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setHostSheetOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveHost()}
              disabled={saving || !hostForm.firstName.trim() || !hostForm.lastName.trim() || !hostForm.email.trim()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingHostId ? "Save" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={inviteSheetOpen} onOpenChange={setInviteSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Invite host to event</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Event</Label>
              <Select value={inviteForm.eventId} onValueChange={(v) => setInviteForm((f) => ({ ...f, eventId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={eventsLoading ? "Loading events…" : "Select event"} />
                </SelectTrigger>
                <SelectContent>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title} — {format(new Date(e.startsAt), "MMM d, yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-message">Personal message (optional)</Label>
              <Textarea
                id="invite-message"
                rows={4}
                value={inviteForm.message}
                onChange={(e) => setInviteForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="We'd love for you to host this Plant Bingo night!"
              />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setInviteSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void sendInvite()} disabled={saving || !inviteForm.eventId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invitation"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
