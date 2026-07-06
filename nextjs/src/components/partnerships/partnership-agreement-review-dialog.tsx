"use client";

import * as React from "react";
import { Ban, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { FormattedDate } from "@/components/formatted-date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export type PartnershipAgreementReview = {
  status: string;
  holderStatus: string;
  partnerName: string;
  partnerEmail: string | null;
  brandName: string;
  currentOwnershipPercent: number;
  minimumOwnershipPercent: number;
  signedName: string | null;
  signedAt: string | null;
  signatureData: string | null;
  brandRejectionNotes: string | null;
};

type Props = {
  holderId: string | null;
  partnerName?: string;
  brandName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved?: () => void;
  onRejected?: () => void;
};

function agreementStatusLabel(status: string): string {
  if (status === "pending_signature") return "Awaiting signature";
  if (status === "pending_brand_approval") return "Awaiting brand approval";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return status.replace(/_/g, " ");
}

export function PartnershipAgreementReviewDialog({
  holderId,
  partnerName,
  brandName,
  open,
  onOpenChange,
  onApproved,
  onRejected,
}: Props) {
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState<"approve" | "reject" | null>(null);
  const [agreement, setAgreement] = React.useState<PartnershipAgreementReview | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !holderId) {
      setAgreement(null);
      setError(null);
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/ownership/holders/${holderId}/agreement`, {
          credentials: "include",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          setError(data?.message ?? "Could not load signed agreement.");
          setAgreement(null);
          return;
        }
        setAgreement(data.agreement as PartnershipAgreementReview);
      } catch {
        setError("Could not load signed agreement.");
        setAgreement(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, holderId]);

  const runAction = async (action: "approve" | "reject") => {
    if (!holderId) return;
    setSubmitting(action);
    try {
      const res = await fetch(`/api/ownership/holders/${holderId}/agreement`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Action failed.");
        return;
      }
      toast.success(data.message ?? (action === "approve" ? "Agreement approved." : "Agreement rejected."));
      onOpenChange(false);
      if (action === "approve") onApproved?.();
      else onRejected?.();
    } finally {
      setSubmitting(null);
    }
  };

  const canApprove = agreement?.status === "pending_brand_approval";
  const displayPartner = agreement?.partnerName ?? partnerName ?? "Partner";
  const displayBrand = agreement?.brandName ?? brandName ?? "Brand";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Signed Partnership Agreement
          </DialogTitle>
          <DialogDescription>
            Review the signed agreement for <strong>{displayPartner}</strong> at{" "}
            <strong>{displayBrand}</strong> before approving.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading signed document…
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{error}</p>
        ) : agreement ? (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {agreementStatusLabel(agreement.status)}
              </Badge>
              {agreement.signedAt ? (
                <span className="text-muted-foreground">
                  Signed on <FormattedDate value={agreement.signedAt} />
                </span>
              ) : null}
            </div>

            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <p className="font-medium">Brand Partnership Agreement</p>
              <p>
                This agreement is between <strong>{agreement.brandName}</strong> and{" "}
                <strong>{agreement.partnerName}</strong>
                {agreement.partnerEmail ? ` (${agreement.partnerEmail})` : ""}.
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Current ownership: <strong>{agreement.currentOwnershipPercent}%</strong>
                </li>
                <li>
                  Minimum protected ownership: <strong>{agreement.minimumOwnershipPercent}%</strong>
                </li>
              </ul>
              <p className="text-muted-foreground">
                By signing below, the partner agreed to the brand partnership terms, including
                ownership percentages and referral responsibilities outlined by {agreement.brandName}.
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="font-medium">Partner signature</p>
              {agreement.signedName ? (
                <p>
                  Printed name: <strong>{agreement.signedName}</strong>
                </p>
              ) : null}
              {agreement.signatureData ? (
                <div className="rounded-md border bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={agreement.signatureData}
                    alt={`Signature of ${agreement.signedName ?? agreement.partnerName}`}
                    className="max-h-32 w-full object-contain object-left"
                  />
                </div>
              ) : (
                <p className="text-muted-foreground">No signature on file.</p>
              )}
            </div>

            {agreement.status === "rejected" && agreement.brandRejectionNotes ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive">
                Rejection reason: {agreement.brandRejectionNotes}
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting != null}>
            Close
          </Button>
          {canApprove ? (
            <>
              <Button
                variant="destructive"
                onClick={() => void runAction("reject")}
                disabled={submitting != null}
              >
                {submitting === "reject" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
                Reject
              </Button>
              <Button onClick={() => void runAction("approve")} disabled={submitting != null}>
                {submitting === "approve" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Approve agreement
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
