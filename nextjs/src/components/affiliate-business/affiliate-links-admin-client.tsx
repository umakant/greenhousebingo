"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Link2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  AffiliateAdminListShell,
  useAffiliateListPagination,
} from "@/components/affiliate-business/affiliate-admin-list-shell";
import {
  AffiliateLinkFormSheet,
  type AffiliateLinkFormValues,
} from "@/components/affiliate-business/affiliate-link-form-sheet";
import { AffiliateStatusBadge } from "@/components/affiliate-business/affiliate-status-badge";
import { buildAffiliateRedirectUrl } from "@/lib/affiliate-link-utils";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/admin-t";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LinkRow = {
  id: string;
  label: string | null;
  destinationUrl: string | null;
  slug: string;
  trackingUrl: string;
  status: string;
  clickCount: number;
  createdAt: string;
  partner: { id: string; name: string; referralCode: string };
  program: { id: string; name: string };
};

type ProgramOption = { id: string; name: string };
type PartnerOption = { id: string; name: string };


export function AffiliateLinksAdminClient() {
  const searchParams = useSearchParams();
  const initialProgramId = searchParams?.get("program") ?? "";
  const initialPartnerId = searchParams?.get("partner") ?? "";

  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [items, setItems] = React.useState<LinkRow[]>([]);
  const [search, setSearch] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [programFilter, setProgramFilter] = React.useState(initialProgramId);
  const [partnerFilter, setPartnerFilter] = React.useState(initialPartnerId);
  const [programs, setPrograms] = React.useState<ProgramOption[]>([]);
  const [partners, setPartners] = React.useState<PartnerOption[]>([]);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetMode, setSheetMode] = React.useState<"create" | "edit">("create");
  const [editInitial, setEditInitial] = React.useState<AffiliateLinkFormValues | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const { page, perPage, setPage, setPerPage, resetPage, paginate } = useAffiliateListPagination(10);

  React.useEffect(() => {
    void Promise.all([
      fetch("/api/affiliate-business/programs", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/affiliate-business/partners", { credentials: "include" }).then((r) => r.json()),
    ]).then(([progData, partnerData]) => {
      setPrograms((progData as { items?: ProgramOption[] })?.items ?? []);
      setPartners((partnerData as { items?: PartnerOption[] })?.items ?? []);
    });
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (appliedSearch) params.set("search", appliedSearch);
      if (status) params.set("status", status);
      if (programFilter) params.set("programId", programFilter);
      if (partnerFilter) params.set("partnerId", partnerFilter);
      const qs = params.toString();
      const res = await fetch(`/api/affiliate-business/links${qs ? `?${qs}` : ""}`, {
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; items?: LinkRow[] };
      if (!res.ok || !data?.ok) {
        toast.error("Failed to load affiliate links");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, status, programFilter, partnerFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleSearch = () => {
    setAppliedSearch(search.trim());
    resetPage();
  };

  const { slice, total, lastPage, from, to, safePage } = paginate(items);
  React.useEffect(() => {
    if (safePage !== page) setPage(safePage);
  }, [safePage, page, setPage]);

  const openCreate = () => {
    setSheetMode("create");
    setEditInitial(null);
    setSheetOpen(true);
  };

  const openEdit = (row: LinkRow) => {
    setSheetMode("edit");
    setEditInitial({
      id: row.id,
      partnerId: row.partner.id,
      programId: row.program.id,
      label: row.label ?? "",
      destinationUrl: row.destinationUrl ?? "",
      status: row.status,
    });
    setSheetOpen(true);
  };

  const copyUrl = (url: string, label: string) => {
    void navigator.clipboard.writeText(url);
    toast.success(`${label} copied`);
  };

  const generateAll = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/affiliate-business/links/generate", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; created?: number };
      if (!res.ok || !data?.ok) {
        toast.error("Could not generate links");
        return;
      }
      toast.success(
        data.created ? `Generated ${data.created} link(s)` : "All active partner/program links already exist",
      );
      void load();
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/affiliate-business/links/${deleteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean };
      if (!res.ok || !data?.ok) {
        toast.error("Delete failed");
        return;
      }
      toast.success("Link deleted");
      setDeleteId(null);
      void load();
    } finally {
      setDeleting(false);
    }
  };

  const linkActions = (row: LinkRow) => {
    const shortUrl = buildAffiliateRedirectUrl(row.id);
    const menuItems: TableActionItem[] = [
      { label: t("Copy tracking URL"), onSelect: () => copyUrl(row.trackingUrl, "Tracking URL") },
      { label: t("Copy short link"), onSelect: () => copyUrl(shortUrl, "Short link") },
      { label: t("Edit"), onSelect: () => openEdit(row) },
      { label: t("Delete"), onSelect: () => setDeleteId(row.id), destructive: true },
    ];
    return {
      label: t("Edit"),
      onPrimaryClick: () => openEdit(row),
      items: menuItems,
    };
  };

  const activeFilterCount = [status, programFilter, partnerFilter].filter(Boolean).length;
  const hasFilters = !!appliedSearch.trim() || activeFilterCount > 0;

  return (
    <>
      <AffiliateAdminListShell
        search={search}
        onSearchChange={setSearch}
        onSearch={handleSearch}
        searchPlaceholder={t("Search links, partners, programs…")}
        loading={loading}
        itemCount={items.length}
        pagination={{ page, perPage, onPageChange: setPage, onPerPageChange: setPerPage }}
        paginatedTotal={total}
        paginatedLastPage={lastPage}
        paginatedFrom={from}
        paginatedTo={to}
        activeFilterCount={activeFilterCount}
        hasFilters={hasFilters}
        onClearFilters={() => {
          setSearch("");
          setAppliedSearch("");
          setStatus("");
          setProgramFilter("");
          setPartnerFilter("");
          resetPage();
        }}
        filterContent={
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("Program")}</label>
              <Select
                value={programFilter || "all"}
                onValueChange={(v) => {
                  setProgramFilter(v === "all" ? "" : v);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("All programs")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All programs")}</SelectItem>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("Partner")}</label>
              <Select
                value={partnerFilter || "all"}
                onValueChange={(v) => {
                  setPartnerFilter(v === "all" ? "" : v);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("All partners")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All partners")}</SelectItem>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{t("Status")}</label>
              <Select
                value={status || "all"}
                onValueChange={(v) => {
                  setStatus(v === "all" ? "" : v);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("All statuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All statuses")}</SelectItem>
                  <SelectItem value="active">{t("Active")}</SelectItem>
                  <SelectItem value="paused">{t("Paused")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        }
        createLabel={t("Create Link")}
        onCreateClick={openCreate}
        emptyIcon={Link2}
        emptyTitle={t("No affiliate links yet")}
        emptyDescription={t("Create trackable links for partners and programs, or auto-generate them in bulk.")}
      >
        <div className="flex flex-wrap items-center justify-end gap-2 border-b bg-muted/20 px-4 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={generating}
            onClick={() => void generateAll()}
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            {generating ? t("Generating…") : t("Generate all active links")}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">{t("Link")}</th>
                <th className="p-3 text-left font-medium">{t("Partner")}</th>
                <th className="p-3 text-left font-medium">{t("Program")}</th>
                <th className="p-3 text-left font-medium">{t("Tracking URL")}</th>
                <th className="p-3 text-right font-medium">{t("Clicks")}</th>
                <th className="p-3 text-left font-medium">{t("Status")}</th>
                <th className="p-3 text-right font-medium">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-medium">{row.label ?? row.slug}</div>
                    <div className="font-mono text-xs text-muted-foreground">{row.slug}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{row.partner.name}</div>
                    <div className="text-xs text-muted-foreground">{row.partner.referralCode}</div>
                  </td>
                  <td className="p-3">{row.program.name}</td>
                  <td className="max-w-xs p-3">
                    <button
                      type="button"
                      className="inline-flex max-w-full items-center gap-1 truncate text-left text-primary hover:underline"
                      title={row.trackingUrl}
                      onClick={() => copyUrl(row.trackingUrl, "Tracking URL")}
                    >
                      <span className="truncate">{row.trackingUrl}</span>
                      <Copy className="h-3 w-3 shrink-0" />
                    </button>
                  </td>
                  <td className="p-3 text-right tabular-nums">{row.clickCount}</td>
                  <td className="p-3">
                    <AffiliateStatusBadge status={row.status} />
                  </td>
                  <td className="p-3 text-right">
                    <TableActionButton {...linkActions(row)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AffiliateAdminListShell>

      <AffiliateLinkFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={sheetMode}
        initial={editInitial}
        defaultPartnerId={partnerFilter}
        defaultProgramId={programFilter}
        onSaved={() => void load()}
      />

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Delete link")}</DialogTitle>
            <DialogDescription>
              {t("Partners will no longer be able to use this tracking link.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              {t("Cancel")}
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? t("Deleting…") : t("Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
