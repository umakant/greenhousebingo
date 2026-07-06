"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Pencil,
  Printer,
  Send,
  ThumbsDown,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/contexts/app-settings-context";
import { formatCurrency as fmtCurrencyLib } from "@/lib/format-currency";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";

type ProposalPayload = {
  ok: boolean;
  company?: { name: string; email: string };
  proposal?: {
    id: string;
    proposal_number: string;
    proposal_date: string | null;
    due_date: string | null;
    description: string | null;
    currency: string;
    require_signature: boolean;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    status: string;
    contact_name: string;
    deal_name: string | null;
    project_name: string | null;
    notes: string | null;
    payment_terms: string | null;
    items: Array<{
      id: string;
      description: string | null;
      quantity: number;
      unit_price: number;
      tax_percentage: number;
      total_amount: number;
    }>;
    lead: { name: string; email: string | null; company: string | null } | null;
    customer?: { email: string | null } | null;
  };
  error?: string;
};

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "accepted") return "border-emerald-600/30 bg-emerald-600 text-white hover:bg-emerald-600";
  if (s === "rejected") return "border-red-500/30 bg-red-500 text-white hover:bg-red-500";
  if (s === "sent") return "border-primary/30 bg-primary text-primary-foreground hover:bg-primary";
  return "border-amber-500/30 bg-amber-500 text-white hover:bg-amber-500";
}

export function SalesProposalViewClient({ proposalId }: { proposalId: string }) {
  const searchParams = useSearchParams();
  const { settings } = useAppSettings();
  const formatCurrency = (n: number) => fmtCurrencyLib(n, settings);
  const formatDate = (s: string | null) => {
    if (!s) return "—";
    try {
      return fmtDateLib(s, settings);
    } catch {
      return s;
    }
  };

  const [data, setData] = React.useState<ProposalPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);

  const viewHref = `/sales-proposals/${proposalId}`;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales-proposals/${proposalId}`, { credentials: "include", cache: "no-store" });
      const json = (await res.json()) as ProposalPayload;
      if (!res.ok || !json.ok) throw new Error(json.error ?? t("Failed to load proposal"));
      setData(json);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("Error"));
      setData({ ok: false });
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const print = searchParams?.get("print") === "1" || searchParams?.get("download") === "1";
    if (!print || !data?.proposal) return;
    const tid = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(tid);
  }, [searchParams, data?.proposal]);

  React.useEffect(() => {
    if (!data?.ok || !data.proposal) return;
    document.documentElement.classList.add("invoice-print-scope");
    return () => document.documentElement.classList.remove("invoice-print-scope");
  }, [data?.ok, data?.proposal]);

  const updateStatus = async (status: string, opts?: { silent?: boolean }) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/sales-proposals/${proposalId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !json.ok) throw new Error(t("Update failed"));
      if (!opts?.silent) toast.success(t("Proposal updated"));
      void load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("Error"));
    } finally {
      setUpdating(false);
    }
  };

  const openDownload = () => {
    window.open(`${viewHref}?download=1`, "_blank", "noopener,noreferrer");
  };

  const handlePrint = () => window.print();

  const sendProposal = async () => {
    const email = data?.proposal?.lead?.email?.trim() || data?.proposal?.customer?.email?.trim();
    if (!email) {
      toast.error(t("No contact email on this proposal."));
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/sales-proposals/${proposalId}/send-email`, {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (res.ok && json.ok) {
        toast.success(t("Proposal sent."));
        await updateStatus("sent", { silent: true });
        return;
      }

      const link = `${window.location.origin}${viewHref}`;
      const subject = `${t("Proposal")}: ${data?.proposal?.proposal_number ?? ""}`;
      const body = `${t("Please review your proposal at the link below.")}\n\n${link}`;
      window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("Error"));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        {t("Loading...")}
      </div>
    );
  }

  if (!data?.ok || !data.proposal || !data.company) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        {t("Proposal not found.")}{" "}
        <Link href="/sales-proposals" className="text-primary underline">
          {t("Back to proposals")}
        </Link>
      </p>
    );
  }

  const p = data.proposal;
  const co = data.company;
  const statusLower = (p.status ?? "").toLowerCase();
  const isAccepted = statusLower === "accepted";

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-2 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden md:mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sales-proposals">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("Back")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_min(100%,280px)] lg:items-start">
        <article
          id="proposal-print-root"
          className="overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm print:border-0 print:shadow-none"
        >
          <div className="border-b border-border/60 p-8 pb-6">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
              <div>
                <div className="text-xl font-bold tracking-tight text-primary">{co.name}</div>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">{co.email || "—"}</p>
              </div>
              <div className="text-right text-sm">
                <div className="text-lg font-semibold uppercase tracking-wide">{t("Proposal")}</div>
                <p className="mt-1 tabular-nums">
                  <span className="font-medium text-foreground">#</span>
                  {p.proposal_number}
                </p>
                <p className="mt-1 text-muted-foreground">
                  <span className="font-medium text-foreground">{t("Date")}:</span> {formatDate(p.proposal_date)}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">{t("Valid Till")}:</span> {formatDate(p.due_date)}
                </p>
                <Badge className={cn("mt-2 uppercase", statusBadgeClass(p.status))}>{p.status}</Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-8 border-b border-border/60 p-8 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Lead Contact")}</h3>
              <div className="mt-3 space-y-1 text-sm">
                <p className="font-semibold">{p.contact_name}</p>
                {p.lead?.email ? <p className="text-muted-foreground">{p.lead.email}</p> : null}
                {p.lead?.company ? <p>{p.lead.company}</p> : null}
              </div>
            </div>
            <div>
              {p.deal_name ? (
                <>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Deal")}</h3>
                  <p className="mt-3 text-sm font-medium">{p.deal_name}</p>
                </>
              ) : p.project_name ? (
                <>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Project")}</h3>
                  <p className="mt-3 text-sm font-medium">{p.project_name}</p>
                </>
              ) : (
                <p className="mt-6 text-sm text-muted-foreground">—</p>
              )}
            </div>
          </div>

          {p.description ? (
            <div className="border-b border-border/60 px-8 py-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Description")}</h3>
              <div
                className="prose prose-sm mt-3 max-w-none text-muted-foreground dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: p.description }}
              />
            </div>
          ) : null}

          <div className="px-8 pt-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-3 text-left font-semibold">{t("Description")}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t("Qty")}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t("Unit Price")}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t("Tax")}</th>
                  <th className="px-3 py-3 text-right font-semibold">{t("Amount")}</th>
                </tr>
              </thead>
              <tbody>
                {p.items.map((it) => (
                  <tr key={it.id} className="border-b border-border/80">
                    <td className="px-3 py-4 align-top">{it.description || "—"}</td>
                    <td className="px-3 py-4 align-top text-right tabular-nums">{it.quantity}</td>
                    <td className="px-3 py-4 align-top text-right tabular-nums">{formatCurrency(it.unit_price)}</td>
                    <td className="px-3 py-4 align-top text-right tabular-nums">
                      {it.tax_percentage > 0 ? `${it.tax_percentage}%` : "—"}
                    </td>
                    <td className="px-3 py-4 align-top text-right font-medium tabular-nums">
                      {formatCurrency(it.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-6 p-8 pt-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {p.notes?.trim() ? (
                <>
                  <span className="font-medium text-foreground">{t("Note")}:</span> {p.notes}
                </>
              ) : p.payment_terms?.trim() ? (
                <>
                  <span className="font-medium text-foreground">{t("Terms")}:</span> {p.payment_terms}
                </>
              ) : (
                <span>{t("Thanks for your business.")}</span>
              )}
              {p.require_signature ? (
                <p className="mt-2 text-xs">{t("Customer signature required for approval.")}</p>
              ) : null}
            </div>
            <div className="w-full max-w-xs space-y-2 text-sm sm:text-right">
              <div className="flex justify-between gap-8 border-b border-border/60 py-1">
                <span className="text-muted-foreground">{t("Sub Total")}</span>
                <span className="tabular-nums">{formatCurrency(p.subtotal)}</span>
              </div>
              {p.discount_amount > 0 ? (
                <div className="flex justify-between gap-8 border-b border-border/60 py-1">
                  <span className="text-muted-foreground">{t("Discount")}</span>
                  <span className="tabular-nums">-{formatCurrency(p.discount_amount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between gap-8 border-b border-border/60 py-1">
                <span className="text-muted-foreground">{t("Tax")}</span>
                <span className="tabular-nums">{formatCurrency(p.tax_amount)}</span>
              </div>
              <div className="flex justify-between gap-8 pt-1 text-base font-bold">
                <span>{t("Total")}</span>
                <span className="tabular-nums text-primary">{formatCurrency(p.total_amount)}</span>
              </div>
            </div>
          </div>
        </article>

        <aside className="flex flex-col gap-3 print:hidden">
          <Button
            className="w-full justify-center gap-2 bg-primary"
            type="button"
            disabled={sending || updating}
            onClick={() => void sendProposal()}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {t("Send Proposal")}
          </Button>

          <Button variant="outline" className="w-full justify-center gap-2" type="button" onClick={openDownload}>
            <Download className="h-4 w-4" />
            {t("Download")}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" type="button" onClick={handlePrint}>
              <Printer className="mr-1 h-4 w-4" />
              {t("Print")}
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => toast.message(t("Open the proposal list and use Create Proposal to make changes."))}
            >
              <Pencil className="mr-1 h-4 w-4" />
              {t("Edit")}
            </Button>
          </div>

          {!isAccepted ? (
            <Button
              className="w-full justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-600/90"
              type="button"
              disabled={updating}
              onClick={() => void updateStatus("accepted")}
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {t("Accept Proposal")}
            </Button>
          ) : null}

          {statusLower !== "rejected" && !isAccepted ? (
            <Button
              variant="outline"
              className="w-full justify-center gap-2 text-destructive hover:text-destructive"
              type="button"
              disabled={updating}
              onClick={() => void updateStatus("rejected")}
            >
              <ThumbsDown className="h-4 w-4" />
              {t("Reject")}
            </Button>
          ) : null}

          <Button
            variant="outline"
            className="w-full justify-center gap-2"
            type="button"
            onClick={() => toast.message(t("Convert to invoice will be available soon."))}
          >
            <FileText className="h-4 w-4" />
            {t("Convert to Invoice")}
          </Button>
        </aside>
      </div>
    </div>
  );
}
