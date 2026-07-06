"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Bell,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Files,
  Loader2,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableActionButton } from "@/components/ui/table-action-button";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/contexts/translation-context";

type InvoiceGet = {
  ok?: boolean;
  invoice?: {
    id: string;
    reference_number: string;
    date: string;
    amount: string;
    status: string;
    category: string | null;
    description: string | null;
    notes: string | null;
    customer?: {
      companyName: string;
      contactPersonEmail: string;
    } | null;
  };
  error?: string;
};

export function CompanyInvoiceRowActions({
  companyId,
  row,
  onDeleted,
  onViewInline,
}: {
  companyId: string;
  row: { id: string; reference_number: string };
  onDeleted?: () => void;
  /** When set, View opens the preview in the parent tab instead of navigating away. */
  onViewInline?: (invoiceId: string) => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const previewHref = `/companies/${companyId}/invoices/${row.id}`;
  const apiBase = `/api/companies/${encodeURIComponent(companyId)}/invoices/${encodeURIComponent(row.id)}`;

  const [editOpen, setEditOpen] = React.useState(false);
  const [editLoading, setEditLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    date: "",
    amount: "",
    status: "",
    category: "",
    description: "",
    notes: "",
  });

  const fetchInvoice = React.useCallback(async (): Promise<InvoiceGet["invoice"] | null> => {
    const res = await fetch(apiBase, { credentials: "include", cache: "no-store" });
    const json = (await res.json()) as InvoiceGet;
    if (!res.ok || !json.ok || !json.invoice) {
      toast.error(json.error ?? t("Failed to load invoice"));
      return null;
    }
    return json.invoice;
  }, [apiBase, t]);

  React.useEffect(() => {
    if (!editOpen) return;
    let cancelled = false;
    setEditLoading(true);
    void (async () => {
      const inv = await fetchInvoice();
      if (cancelled || !inv) {
        if (!cancelled) setEditLoading(false);
        return;
      }
      setForm({
        date: inv.date?.slice(0, 10) ?? "",
        amount: inv.amount ?? "",
        status: inv.status ?? "",
        category: inv.category ?? "",
        description: inv.description ?? "",
        notes: inv.notes ?? "",
      });
      if (!cancelled) setEditLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [editOpen, fetchInvoice]);

  const saveEdit = async () => {
    if (!form.date.trim()) {
      toast.error(t("Date is required"));
      return;
    }
    const amt = Number(form.amount);
    if (!Number.isFinite(amt)) {
      toast.error(t("Invalid amount"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(apiBase, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          amount: amt,
          status: form.status,
          category: form.category || null,
          description: form.description || null,
          notes: form.notes || null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? t("Save failed"));
      toast.success(t("Invoice updated"));
      setEditOpen(false);
      onDeleted?.();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!(await appConfirm(t("Delete this invoice?")))) return;
    try {
      const res = await fetch(apiBase, {
        method: "DELETE",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed");
      toast.success(t("Deleted"));
      onDeleted?.();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  const openDownload = () => {
    if (typeof window === "undefined") return;
    window.open(`${window.location.origin}${previewHref}?print=1`, "_blank", "noopener,noreferrer");
  };

  const mailtoForInvoice = async (kind: "send" | "reminder") => {
    const inv = await fetchInvoice();
    if (!inv) return;
    const email = inv.customer?.contactPersonEmail?.trim();
    if (!email) {
      toast.error(t("No customer email on this invoice."));
      return;
    }
    const subject =
      kind === "reminder"
        ? t("Payment reminder:") + ` ${inv.reference_number}`
        : t("Invoice:") + ` ${inv.reference_number}`;
    const link =
      typeof window !== "undefined" ? `${window.location.origin}${previewHref}` : previewHref;
    const body =
      kind === "reminder"
        ? t("This is a friendly reminder regarding the invoice above. Please arrange payment.") +
          `\n\n${link}`
        : t("Please find your invoice at the link below.") + `\n\n${link}`;
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const addShipping = () => {
    toast.message(t("Update shipping or billing address in Contacts for this customer."));
    router.push(`/companies/${companyId}?section=contacts`);
  };

  const addPayment = () => {
    router.push(`/companies/${companyId}?section=payments`);
  };

  const copyPaymentLink = async () => {
    const link =
      typeof window !== "undefined" ? `${window.location.origin}${previewHref}` : previewHref;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("Link copied to clipboard"));
    } catch {
      toast.error(t("Could not copy"));
    }
  };

  const viewPaymentPage = () => {
    if (typeof window === "undefined") return;
    window.open(`${window.location.origin}${previewHref}`, "_blank", "noopener,noreferrer");
  };

  const duplicate = async () => {
    try {
      const res = await fetch(`${apiBase}/duplicate`, {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        id?: string;
        reference_number?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Duplicate failed");
      toast.success(
        json.reference_number
          ? `${t("Duplicate created")}: ${json.reference_number}`
          : t("Duplicate created"),
      );
      onDeleted?.();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  return (
    <>
      <TableActionButton
        label={t("View")}
        primaryHref={onViewInline ? undefined : previewHref}
        onPrimaryClick={onViewInline ? () => onViewInline(row.id) : undefined}
        items={[
          onViewInline
            ? { label: t("View"), onSelect: () => onViewInline(row.id), icon: <Eye className="h-4 w-4" /> }
            : { label: t("View"), href: previewHref, icon: <Eye className="h-4 w-4" /> },
          {
            label: t("Edit"),
            onSelect: () => setEditOpen(true),
            icon: <Pencil className="h-4 w-4" />,
          },
          { label: t("Delete"), onSelect: del, destructive: true, icon: <Trash2 className="h-4 w-4" /> },
          { label: t("Download"), onSelect: openDownload, icon: <Download className="h-4 w-4" /> },
          {
            label: t("Send"),
            onSelect: () => void mailtoForInvoice("send"),
            icon: <Send className="h-4 w-4" />,
          },
          {
            label: t("Add Shipping Address"),
            onSelect: addShipping,
            icon: <Plus className="h-4 w-4" />,
          },
          {
            label: t("Payment Reminder"),
            onSelect: () => void mailtoForInvoice("reminder"),
            icon: <Bell className="h-4 w-4" />,
          },
          {
            label: t("Add Payment"),
            onSelect: addPayment,
            icon: <Banknote className="h-4 w-4" />,
          },
          {
            label: t("Copy Payment Link"),
            onSelect: () => void copyPaymentLink(),
            icon: <Copy className="h-4 w-4" />,
          },
          {
            label: t("View Payment Page"),
            onSelect: viewPaymentPage,
            icon: <ExternalLink className="h-4 w-4" />,
          },
          {
            label: t("Create Duplicate"),
            onSelect: () => void duplicate(),
            icon: <Files className="h-4 w-4" />,
          },
        ]}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("Edit invoice")} #{row.reference_number}
            </DialogTitle>
          </DialogHeader>
          {editLoading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("Loading...")}
            </div>
          ) : (
            <div className="grid gap-3 py-2">
              <div className="space-y-2">
                <Label htmlFor={`inv-date-${row.id}`}>{t("Date")}</Label>
                <Input
                  id={`inv-date-${row.id}`}
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`inv-amt-${row.id}`}>{t("Amount")}</Label>
                <Input
                  id={`inv-amt-${row.id}`}
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`inv-st-${row.id}`}>{t("Status")}</Label>
                <Input
                  id={`inv-st-${row.id}`}
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`inv-cat-${row.id}`}>{t("Category")}</Label>
                <Input
                  id={`inv-cat-${row.id}`}
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`inv-desc-${row.id}`}>{t("Description")}</Label>
                <Textarea
                  id={`inv-desc-${row.id}`}
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`inv-notes-${row.id}`}>{t("Notes")}</Label>
                <Textarea
                  id={`inv-notes-${row.id}`}
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button type="button" disabled={editLoading || saving} onClick={() => void saveEdit()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
