"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Link2, Trash2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { t } from "@/lib/admin-t";


interface ResumeRow {
  id: string;
  name: string;
  email: string;
  templateName: string | null;
  code: string;
  createdAt: string | null;
}

function PaginationBar({ page, lastPage, onChange }: { page: number; lastPage: number; onChange: (p: number) => void }) {
  if (lastPage <= 1) return null;
  const pages: (number | "...")[] = [];
  if (lastPage <= 7) {
    for (let i = 1; i <= lastPage; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 4) pages.push("...");
    for (let i = Math.max(2, page - 2); i <= Math.min(lastPage - 1, page + 2); i++) pages.push(i);
    if (page < lastPage - 3) pages.push("...");
    pages.push(lastPage);
  }
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" onClick={() => onChange(page - 1)} disabled={page <= 1} className="px-3">Previous</Button>
      {pages.map((p, i) =>
        p === "..." ? <span key={`e-${i}`} className="px-2 text-muted-foreground text-sm">…</span> : (
          <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="w-8 px-0" onClick={() => onChange(p as number)}>{p}</Button>
        )
      )}
      <Button variant="outline" size="sm" onClick={() => onChange(page + 1)} disabled={page >= lastPage} className="px-3">Next</Button>
    </div>
  );
}


interface Props {
  permissions: string[];
}

export default function ResumeBuilderAdmin({ permissions }: Props) {
  const router = useRouter();
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-resume-builder");
  const { settings } = useAppSettings();
  const formatDate = (d: string | null | undefined) => fmtDateLib(d, settings);

  const [rows, setRows] = React.useState<ResumeRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [lastPage, setLastPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  async function load(pg = page, pp = perPage, q = search) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), per_page: String(pp) });
      if (q) params.set("search", q);
      const res = await fetch(`/api/resume-builder/resumes?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) { toast.error(json?.error || t("Failed to load resumes")); return; }
      setRows(json.data ?? []);
      setTotal(json.total ?? 0);
      setLastPage(json.last_page ?? 1);
    } finally { setLoading(false); }
  }

  React.useEffect(() => { load(page, perPage, search); }, [page, perPage, search]);

  function handleSearch() {
    setSearch(searchInput);
    setPage(1);
  }

  async function copyLink(code: string) {
    const url = `${window.location.origin}/resume-builder/view/${code}`;
    await navigator.clipboard.writeText(url);
    toast.success(t("Resume link copied!"));
  }

  async function del(id: string) {
    if (!(await appConfirm(t("Are you sure you want to delete this resume?")))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/resume-builder/resumes/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json?.error || t("Failed to delete resume")); return; }
      toast.success(t("Resume deleted"));
      load(page, perPage, search);
    } finally { setDeletingId(null); }
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder={t("Search resumes...")}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} size="sm">{t("Search")}</Button>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(perPage)}
            onValueChange={v => { setPerPage(Number(v)); setPage(1); }}
          >
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 25, 50].map(n => (
                <SelectItem key={n} value={String(n)}>{n} per page</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {can("create-resume") && (
            <Button size="sm" onClick={() => router.push("/resume-builder/create")}>
              <Plus className="h-4 w-4 mr-1" />
              {t("Create Resume")}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                <div className="flex items-center gap-1">{t("Name")} <span className="text-muted-foreground/50">↑↓</span></div>
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                <div className="flex items-center gap-1">{t("Email")} <span className="text-muted-foreground/50">↑↓</span></div>
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                <div className="flex items-center gap-1">{t("Template")} <span className="text-muted-foreground/50">↑↓</span></div>
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                <div className="flex items-center gap-1">{t("Created")} <span className="text-muted-foreground/50">↑↓</span></div>
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">{t("Loading...")}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">{t("No resumes found")}</td></tr>
            ) : rows.map(row => (
              <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.email}</td>
                <td className="px-4 py-3">{row.templateName ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(row.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyLink(row.code)}
                      title={t("Copy resume link")}
                      className="p-1.5 rounded-md hover:bg-muted text-blue-500 hover:text-blue-600 transition-colors"
                    >
                      <Link2 className="h-4 w-4" />
                    </button>
                    {can("delete-resume") && (
                      <button
                        onClick={() => del(row.id)}
                        disabled={deletingId === row.id}
                        title={t("Delete resume")}
                        className="p-1.5 rounded-md hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {t("Showing")} {rows.length === 0 ? 0 : (page - 1) * perPage + 1}–{(page - 1) * perPage + rows.length} {t("of")} {total}
        </span>
        <PaginationBar page={page} lastPage={lastPage} onChange={p => setPage(p)} />
      </div>
    </div>
  );
}
