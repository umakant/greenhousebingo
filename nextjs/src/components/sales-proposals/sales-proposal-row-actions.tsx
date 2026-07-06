"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, Eye, FileText, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { TableActionButton } from "@/components/ui/table-action-button";
import { t } from "@/lib/admin-t";

type Row = {
  id: string;
  proposal_number: string;
  lead?: { email?: string } | null;
  customer?: { email?: string } | null;
};

export function SalesProposalRowActions({
  row,
  onRefresh,
}: {
  row: Row;
  onRefresh?: () => void;
}) {
  const router = useRouter();
  const viewHref = `/sales-proposals/${row.id}`;

  const openPrint = () => {
    window.open(`${viewHref}?print=1`, "_blank", "noopener,noreferrer");
  };

  const sendProposal = () => {
    const email = row.lead?.email || row.customer?.email;
    if (!email) {
      toast.error(t("No contact email on this proposal."));
      return;
    }
    const link = `${window.location.origin}${viewHref}`;
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`${t("Proposal")}: ${row.proposal_number}`)}&body=${encodeURIComponent(link)}`;
  };

  const updateStatus = async (status: string) => {
    try {
      const res = await fetch(`/api/sales-proposals/${row.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? t("Update failed"));
      toast.success(t("Proposal updated"));
      onRefresh?.();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("Error"));
    }
  };

  const duplicate = async () => {
    toast.message(t("Create Duplicate will copy this proposal soon."));
  };

  return (
    <TableActionButton
      label={t("Action")}
      primaryHref={viewHref}
      items={[
        { label: t("View"), href: viewHref, icon: <Eye className="h-4 w-4" /> },
        { label: t("Download"), onSelect: openPrint, icon: <Download className="h-4 w-4" /> },
        { label: t("View PDF"), onSelect: openPrint, icon: <Eye className="h-4 w-4" /> },
        { label: t("Send"), onSelect: sendProposal, icon: <Send className="h-4 w-4" /> },
        { label: t("Accept"), onSelect: () => void updateStatus("accepted"), icon: <ThumbsUp className="h-4 w-4" /> },
        { label: t("Reject"), onSelect: () => void updateStatus("rejected"), icon: <ThumbsDown className="h-4 w-4" /> },
        {
          label: t("Convert to Invoice"),
          onSelect: () => toast.message(t("Convert to invoice will be available soon.")),
          icon: <FileText className="h-4 w-4" />,
        },
        { label: t("Copy Link"), onSelect: () => void navigator.clipboard.writeText(`${window.location.origin}${viewHref}`).then(() => toast.success(t("Link copied"))), icon: <Copy className="h-4 w-4" /> },
        { label: t("Create Duplicate"), onSelect: () => void duplicate(), icon: <Copy className="h-4 w-4" /> },
      ]}
    />
  );
}
