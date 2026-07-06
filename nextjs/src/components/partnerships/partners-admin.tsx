"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, Loader2, Eye, Pencil, CheckCircle2, Ban } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableActionButton } from "@/components/ui/table-action-button";
import { PartnerFormSheet, type PartnerFormValues } from "@/components/partnerships/partner-form-sheet";

type PartnerRow = {
  id: string;
  name: string;
  email: string | null;
  brandName: string | null;
  slug: string;
  referralCode: string;
  commissionRate: number | null;
  status: string;
  payoutMethod: string | null;
  payoutEmail: string | null;
  phone: string | null;
  notes: string | null;
  companyCount: number;
  commissionTotal: number;
};

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "pending":
      return "secondary";
    case "suspended":
      return "destructive";
    default:
      return "outline";
  }
}

function money(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n || 0);
}

export default function PartnersAdmin() {
  const [rows, setRows] = React.useState<PartnerRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [perPage, setPerPage] = React.useState(10);
  const [page, setPage] = React.useState(1);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<PartnerFormValues | null>(null);

  const searchRef = React.useRef("");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/partnerships/partners", window.location.origin);
      if (searchRef.current.trim()) url.searchParams.set("search", searchRef.current.trim());
      const res = await fetch(url.toString(), { credentials: "include" });
      const data = await res.json();
      if (data?.ok) setRows(data.items as PartnerRow[]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const applySearch = () => {
    searchRef.current = search;
    setPage(1);
    void load();
  };

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * perPage, currentPage * perPage);
  const from = totalRows === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, totalRows);

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (row: PartnerRow) => {
    setMode("edit");
    setEditing({
      id: row.id,
      name: row.name,
      email: row.email ?? "",
      phone: row.phone ?? "",
      brandName: row.brandName ?? "",
      slug: row.slug,
      status: row.status,
      commissionRate: row.commissionRate == null ? "" : String(row.commissionRate),
      payoutMethod: row.payoutMethod ?? "",
      payoutEmail: row.payoutEmail ?? "",
      notes: row.notes ?? "",
    });
    setSheetOpen(true);
  };

  const toggleStatus = async (row: PartnerRow) => {
    const next = row.status === "active" ? "inactive" : "active";
    const res = await fetch(`/api/partnerships/partners/${row.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      toast.success(`Partner ${next === "active" ? "activated" : "deactivated"}`);
      void load();
    } else {
      toast.error(data?.message ?? "Update failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-background">
        <div className="p-4 border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applySearch();
                      }
                    }}
                    placeholder="Search partners…"
                  />
                </div>
                <Button type="button" onClick={applySearch}>
                  Search
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                value={String(perPage)}
                onChange={(e) => {
                  setPerPage(Number(e.target.value || "10"));
                  setPage(1);
                }}
              >
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
              </select>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add partner
              </Button>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Referral code</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Companies</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No partners yet.
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/partnerships/partners/${row.id}`} className="font-medium hover:underline">
                      {row.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{row.email ?? "—"}</div>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.referralCode}</code>
                  </TableCell>
                  <TableCell>{row.commissionRate == null ? "Default" : `${row.commissionRate}%`}</TableCell>
                  <TableCell>{row.companyCount}</TableCell>
                  <TableCell>{money(row.commissionTotal)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <TableActionButton
                      label="View"
                      primaryIcon={<Eye className="h-4 w-4" />}
                      primaryHref={`/partnerships/partners/${row.id}`}
                      className="ml-auto"
                      items={[
                        {
                          label: "View",
                          href: `/partnerships/partners/${row.id}`,
                          icon: <Eye className="h-4 w-4" />,
                        },
                        {
                          label: "Edit",
                          onSelect: () => openEdit(row),
                          icon: <Pencil className="h-4 w-4" />,
                        },
                        row.status === "active"
                          ? {
                              label: "Deactivate",
                              onSelect: () => void toggleStatus(row),
                              icon: <Ban className="h-4 w-4" />,
                              destructive: true,
                            }
                          : {
                              label: "Activate",
                              onSelect: () => void toggleStatus(row),
                              icon: <CheckCircle2 className="h-4 w-4" />,
                            },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="p-4 flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Showing {from} to {to} of {totalRows} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || loading}
              onClick={() => setPage(Math.max(1, currentPage - 1))}
            >
              Previous
            </Button>
            <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground inline-flex items-center justify-center text-xs font-medium">
              {currentPage}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <PartnerFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={mode}
        initial={editing}
        onSaved={() => void load()}
      />
    </div>
  );
}
