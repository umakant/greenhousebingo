"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Download,
  ExternalLink,
  Eye,
  Files,
  Plus,
  Send,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { TableActionButton } from "@/components/ui/table-action-button";
import { t } from "@/lib/admin-t";

type Row = {
  id: string;
  invoice_number: string;
  customer?: { contact_person_email?: string } | null;
};

export function SalesInvoiceRowActions({
  row,
  onRefresh,
}: {
  row: Row;
  onRefresh?: () => void;
}) {
  const router = useRouter();
  const viewHref = `/sales-invoices/${row.id}`;
  const apiBase = `/api/sales-invoices/${encodeURIComponent(row.id)}`;

  const openPrint = () => {
    if (typeof window === "undefined") return;
    window.open(`${window.location.origin}${viewHref}?print=1`, "_blank", "noopener,noreferrer");
  };

  const openPdf = () => {
    openPrint();
  };

  const sendInvoice = () => {
    const email = row.customer?.contact_person_email?.trim();
    if (!email) {
      toast.error(t("No customer email on this invoice."));
      return;
    }
    const link = typeof window !== "undefined" ? `${window.location.origin}${viewHref}` : viewHref;
    const subject = `${t("Invoice")}: ${row.invoice_number}`;
    const body = `${t("Please find your invoice at the link below.")}\n\n${link}`;
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const copyPaymentLink = async () => {
    const token = row.id;
    const link =
      typeof window !== "undefined"
        ? `${window.location.origin}/sales-invoices/${token}?payment=1`
        : viewHref;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t("Link copied to clipboard"));
    } catch {
      toast.error(t("Could not copy"));
    }
  };

  const viewPaymentPage = () => {
    if (typeof window === "undefined") return;
    window.open(`${window.location.origin}${viewHref}?payment=1`, "_blank", "noopener,noreferrer");
  };

  const duplicate = async () => {
    try {
      const res = await fetch(`${apiBase}/duplicate`, { method: "POST", credentials: "include" });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        id?: string;
        invoice_number?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? t("Duplicate failed"));
      toast.success(
        json.invoice_number ? `${t("Duplicate created")}: ${json.invoice_number}` : t("Duplicate created"),
      );
      onRefresh?.();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("Error"));
    }
  };

  return (
    <TableActionButton
      label={t("Action")}
      primaryHref={viewHref}
      items={[
        { label: t("View"), href: viewHref, icon: <Eye className="h-4 w-4" /> },
        { label: t("Download"), onSelect: openPrint, icon: <Download className="h-4 w-4" /> },
        { label: t("View PDF"), onSelect: openPdf, icon: <Eye className="h-4 w-4" /> },
        { label: t("Send"), onSelect: sendInvoice, icon: <Send className="h-4 w-4" /> },
        {
          label: t("Upload"),
          onSelect: () => toast.message(t("Upload attachments will be available soon.")),
          icon: <Upload className="h-4 w-4" />,
        },
        {
          label: t("Add Shipping Address"),
          onSelect: () => toast.message(t("Update shipping address on the customer record.")),
          icon: <Plus className="h-4 w-4" />,
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
          label: t("Add Credit Note"),
          onSelect: () => router.push("/account/credit-notes"),
          icon: <Plus className="h-4 w-4" />,
        },
        {
          label: t("Create Duplicate"),
          onSelect: () => void duplicate(),
          icon: <Files className="h-4 w-4" />,
        },
      ]}
    />
  );
}
