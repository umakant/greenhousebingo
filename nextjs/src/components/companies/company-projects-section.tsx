"use client";

import * as React from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TableActionButton } from "@/components/ui/table-action-button";
import { CompanySectionError } from "@/components/companies/company-section-error";
import { useAppSettings } from "@/contexts/app-settings-context";
import { useTranslation } from "@/contexts/translation-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";

export type CompanyProjectRow = {
  id: string;
  name: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: string | null;
  description: string | null;
  created_at: string;
};

type Props = {
  companyId: string;
  initialProjects?: CompanyProjectRow[];
  /** ISO 4217 code (e.g. USD); used to format the Budget column. */
  defaultCurrency?: string;
};

function formatBudgetCell(raw: string | null | undefined, currencyCode: string): string {
  if (raw == null || raw === "") return "-";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "-";
  const code = currencyCode.length === 3 ? currencyCode : "USD";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return String(raw);
  }
}

function resetFormDefaults() {
  return {
    name: "",
    status: "Not Started",
    startDate: "",
    endDate: "",
    budget: "",
    description: "",
  };
}

function rowToForm(p: CompanyProjectRow) {
  return {
    name: p.name,
    status: p.status ?? "Not Started",
    startDate: p.start_date ? p.start_date.slice(0, 10) : "",
    endDate: p.end_date ? p.end_date.slice(0, 10) : "",
    budget: p.budget != null && p.budget !== "" ? String(p.budget) : "",
    description: p.description ?? "",
  };
}

export default function CompanyProjectsSection({
  companyId,
  initialProjects = [],
  defaultCurrency = "USD",
}: Props) {
  const { t } = useTranslation();
  const { settings } = useAppSettings();
  const fmtDate = (d: string | null | undefined) => fmtDateLib(d, settings);
  const currencyCode = (defaultCurrency ?? "USD").trim() || "USD";
  const [projects, setProjects] = React.useState<CompanyProjectRow[]>(initialProjects);
  const [loadingProjects, setLoadingProjects] = React.useState(initialProjects.length === 0);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [status, setStatus] = React.useState("Not Started");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [budget, setBudget] = React.useState("");
  const [description, setDescription] = React.useState("");

  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleteProcessing, setDeleteProcessing] = React.useState(false);

  function openCreate() {
    setEditingId(null);
    const d = resetFormDefaults();
    setName(d.name);
    setStatus(d.status);
    setStartDate(d.startDate);
    setEndDate(d.endDate);
    setBudget(d.budget);
    setDescription(d.description);
    setFormError(null);
    setSheetOpen(true);
  }

  function openEdit(p: CompanyProjectRow) {
    setEditingId(p.id);
    const d = rowToForm(p);
    setName(d.name);
    setStatus(d.status);
    setStartDate(d.startDate);
    setEndDate(d.endDate);
    setBudget(d.budget);
    setDescription(d.description);
    setFormError(null);
    setSheetOpen(true);
  }

  async function loadProjects() {
    setLoadingProjects(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/projects`, { cache: "no-store" });
      const json = (await res.json()) as { projects?: CompanyProjectRow[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to load projects");
      setLoadError(null);
      setProjects(Array.isArray(json.projects) ? json.projects : []);
    } catch (e: unknown) {
      console.error(e);
      setLoadError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoadingProjects(false);
    }
  }

  React.useEffect(() => {
    if (initialProjects.length === 0) void loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function submitProject(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const payload = {
        name,
        status,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        budget: budget || undefined,
        description: description || undefined,
      };
      const isEdit = editingId != null;
      const url = isEdit
        ? `/api/companies/${companyId}/projects/${editingId}`
        : `/api/companies/${companyId}/projects`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        details?: Record<string, string[]>;
      };
      if (!res.ok) {
        const first = json.details && Object.values(json.details).flat()[0];
        throw new Error(first || json.error || "Failed to save project");
      }
      setSheetOpen(false);
      setEditingId(null);
      const d = resetFormDefaults();
      setName(d.name);
      setStatus(d.status);
      setStartDate(d.startDate);
      setEndDate(d.endDate);
      setBudget(d.budget);
      setDescription(d.description);
      toast.success(isEdit ? t("Project updated.") : t("Project created."));
      await loadProjects();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleteProcessing(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/projects/${deleteId}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(json?.error ?? t("Delete failed."));
        return;
      }
      toast.success(t("Project deleted."));
      setDeleteId(null);
      await loadProjects();
    } catch {
      toast.error(t("Delete failed."));
    } finally {
      setDeleteProcessing(false);
    }
  }

  const deleteTarget = deleteId ? projects.find((p) => p.id === deleteId) : null;

  return (
    <>
      <div className="rounded-xl border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div className="font-medium">{t("Projects")}</div>
          <Button type="button" size="sm" onClick={openCreate}>
            {t("Add Project")}
          </Button>
        </div>
        <CompanySectionError message={loadError} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="border-b">
                <th className="px-4 py-3 text-left font-medium">{t("Name")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("Status")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("Start")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("End")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("Budget")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loadingProjects ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    {t("Loading...")}
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    {t("No projects yet")}
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-accent/20">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">{p.status ?? "-"}</td>
                    <td className="px-4 py-3">{p.start_date ? fmtDate(p.start_date) : "-"}</td>
                    <td className="px-4 py-3">{p.end_date ? fmtDate(p.end_date) : "-"}</td>
                    <td className="px-4 py-3 tabular-nums">{formatBudgetCell(p.budget, currencyCode)}</td>
                    <td className="px-4 py-3 text-right">
                      <TableActionButton
                        label={t("View")}
                        primaryHref={`/project/${p.id}`}
                        items={[
                          {
                            label: t("View"),
                            href: `/project/${p.id}`,
                            icon: <Eye className="h-4 w-4" />,
                          },
                          {
                            label: t("Edit"),
                            onSelect: () => openEdit(p),
                            icon: <Pencil className="h-4 w-4" />,
                          },
                          {
                            label: t("Delete"),
                            onSelect: () => setDeleteId(p.id),
                            destructive: true,
                            icon: <Trash2 className="h-4 w-4" />,
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingId ? t("Edit Project") : t("Add Project")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={submitProject} className="mt-4 space-y-3">
            {formError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </div>
            ) : null}
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t("Name")} *</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t("Status")} *</div>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Not Started">{t("Not Started")}</option>
                <option value="Ongoing">{t("Ongoing")}</option>
                <option value="Completed">{t("Completed")}</option>
                <option value="Cancelled">{t("Cancelled")}</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t("Start date")} *</div>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t("End date")}</div>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t("Budget")}</div>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t("Description")}</div>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("Saving...") : editingId ? t("Save") : t("Create")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteId != null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete project?")}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                {deleteTarget ? (
                  <p className="font-medium text-foreground">{deleteTarget.name}</p>
                ) : null}
                <p>{t("This project will be permanently removed. This cannot be undone.")}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProcessing}>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteProcessing}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleteProcessing ? t("Deleting...") : t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
