"use client";

import * as React from "react";
import { Handshake, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import NoRecordsFound from "@/components/no-records-found";
import MediaPicker from "@/components/MediaPicker";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import {
  buildEventSponsorName,
  formatEventSponsorPersonName,
} from "@/lib/event-platform/sponsors/sponsor-display-name";
import type { EventSponsorDto } from "@/lib/event-platform/sponsors/sponsor-types";
import { appConfirm } from "@/lib/app-confirm";
import { formatPhone, formatPhoneDisplay, normalizeMobileForStorage } from "@/lib/phone";
import { cn } from "@/lib/utils";

const emptySponsorForm = {
  firstName: "",
  lastName: "",
  company: "",
  address: "",
  phone: "",
  perk: "",
  imageUrl: "",
  website: "",
  status: "active",
};

function sponsorFormFromDto(sponsor: EventSponsorDto) {
  const personName = formatEventSponsorPersonName(sponsor);
  const legacyNameOnly =
    !personName && !sponsor.company?.trim() && sponsor.name.trim() ? sponsor.name.trim() : "";

  return {
    firstName: sponsor.firstName ?? "",
    lastName: sponsor.lastName ?? "",
    company: sponsor.company?.trim() || legacyNameOnly,
    address: sponsor.address ?? "",
    phone: formatPhone(sponsor.phone ?? ""),
    perk: sponsor.perk ?? "",
    imageUrl: sponsor.imageUrl ?? "",
    website: sponsor.website ?? "",
    status: sponsor.status,
  };
}

function sponsorDisplayLabel(sponsor: EventSponsorDto): string {
  return buildEventSponsorName({
    firstName: sponsor.firstName ?? "",
    lastName: sponsor.lastName ?? "",
    company: sponsor.company,
  }) || sponsor.name;
}

function sponsorDisplaySubtitle(sponsor: EventSponsorDto): string | null {
  const personName = formatEventSponsorPersonName(sponsor);
  if (sponsor.company?.trim() && personName) return personName;
  return null;
}

export function EventPlatformSponsorsAdmin() {
  const appSettings = useAppSettingsOptional();
  const googleMapsApiKey = appSettings?.settings?.googleMapsApiKey;
  const [sponsors, setSponsors] = React.useState<EventSponsorDto[] | null>(null);
  const [search, setSearch] = React.useState("");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(emptySponsorForm);

  const reload = React.useCallback(async () => {
    const res = await fetch("/api/event-platform/sponsors", { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      items?: EventSponsorDto[];
      message?: string;
    } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not load sponsors.");
      setSponsors([]);
      return;
    }
    setSponsors(data.items ?? []);
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = React.useMemo(() => {
    if (!sponsors) return [];
    const q = search.trim().toLowerCase();
    if (!q) return sponsors;
    return sponsors.filter(
      (s) =>
        sponsorDisplayLabel(s).toLowerCase().includes(q) ||
        (s.company ?? "").toLowerCase().includes(q) ||
        formatEventSponsorPersonName(s).toLowerCase().includes(q) ||
        (s.address ?? "").toLowerCase().includes(q) ||
        (s.phone ?? "").toLowerCase().includes(q),
    );
  }, [sponsors, search]);

  function openCreate() {
    setEditingId(null);
    setForm(emptySponsorForm);
    setSheetOpen(true);
  }

  function openEdit(sponsor: EventSponsorDto) {
    setEditingId(sponsor.id);
    setForm(sponsorFormFromDto(sponsor));
    setSheetOpen(true);
  }

  async function saveSponsor() {
    setSaving(true);
    try {
      const url = editingId ? `/api/event-platform/sponsors/${editingId}` : "/api/event-platform/sponsors";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: normalizeMobileForStorage(form.phone),
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not save sponsor.");
        return;
      }
      toast.success(editingId ? "Sponsor updated." : "Sponsor created.");
      setSheetOpen(false);
      await reload();
    } finally {
      setSaving(false);
    }
  }

  async function archiveSponsor(id: string) {
    const res = await fetch(`/api/event-platform/sponsors/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not archive sponsor.");
      return;
    }
    toast.success("Sponsor archived.");
    await reload();
  }

  async function deleteSponsor(sponsor: EventSponsorDto) {
    const confirmed = await appConfirm({
      title: "Delete sponsor",
      description: `Permanently delete "${sponsorDisplayLabel(sponsor)}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!confirmed) return;

    const res = await fetch(`/api/event-platform/sponsors/${sponsor.id}?permanent=1`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Could not delete sponsor.");
      return;
    }
    toast.success("Sponsor deleted.");
    await reload();
  }

  function sponsorRowActions(sponsor: EventSponsorDto) {
    const items: TableActionItem[] = [];
    if (sponsor.status === "active") {
      items.push({ label: "Archive", onSelect: () => void archiveSponsor(sponsor.id) });
    }
    items.push({
      label: "Delete",
      onSelect: () => void deleteSponsor(sponsor),
      destructive: true,
    });
    return {
      label: "Edit",
      onPrimaryClick: () => openEdit(sponsor),
      items,
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sponsors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage event sponsors and partners for quick assignment on event pages.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add sponsor
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search sponsors…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        {sponsors === null ? (
          <div className="flex items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading sponsors…
          </div>
        ) : filtered.length === 0 ? (
          <NoRecordsFound
            icon={Handshake}
            title="No sponsors yet"
            description="Add a sponsor to assign partners quickly when creating events."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sponsor</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sponsor) => (
                <TableRow key={sponsor.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <Handshake className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium">{sponsorDisplayLabel(sponsor)}</span>
                        {sponsorDisplaySubtitle(sponsor) ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {sponsorDisplaySubtitle(sponsor)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate">{sponsor.company?.trim() || "—"}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{sponsor.address || "—"}</TableCell>
                  <TableCell>{formatPhoneDisplay(sponsor.phone, "—")}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        sponsor.status === "active"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {sponsor.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <TableActionButton {...sponsorRowActions(sponsor)} className="ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingId ? "Edit sponsor" : "Add sponsor"}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sp-first-name">First name</Label>
                <Input
                  id="sp-first-name"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="Jane"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp-last-name">Last name</Label>
                <Input
                  id="sp-last-name"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  placeholder="Smith"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-company">Company</Label>
              <Input
                id="sp-company"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="North Haven Gardens"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-address">Address</Label>
              <AddressAutocomplete
                id="sp-address"
                apiKey={googleMapsApiKey ?? undefined}
                value={form.address}
                onChange={(value) => setForm((f) => ({ ...f, address: value }))}
                onPlaceSelect={(addr) =>
                  setForm((f) => ({
                    ...f,
                    address: addr.formattedAddress || addr.street || f.address,
                  }))
                }
                placeholder="Start typing an address…"
                inputProps={{ autoComplete: "off" }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-phone">Phone</Label>
              <Input
                id="sp-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }))}
                placeholder="(000) 000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-perk">Perk / offer</Label>
              <Textarea
                id="sp-perk"
                rows={3}
                value={form.perk}
                onChange={(e) => setForm((f) => ({ ...f, perk: e.target.value }))}
                placeholder="Every attendee gets a discount card…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sp-website">Website</Label>
              <Input
                id="sp-website"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="https://…"
              />
            </div>
            <MediaPicker
              id="sp-image"
              label="Logo / image"
              value={form.imageUrl}
              onChange={(v) => setForm((f) => ({ ...f, imageUrl: typeof v === "string" ? v : v[0] ?? "" }))}
              placeholder="Select sponsor logo…"
            />
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button
              onClick={() => void saveSponsor()}
              disabled={saving || !form.firstName.trim() || !form.lastName.trim()}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingId ? "Save changes" : "Create sponsor"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
