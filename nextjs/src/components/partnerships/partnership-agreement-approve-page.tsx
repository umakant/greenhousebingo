"use client";

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Agreement = {
  status: string;
  partnerName: string;
  partnerEmail: string | null;
  brandName: string;
  currentOwnershipPercent: number;
  minimumOwnershipPercent: number;
  signedName: string | null;
  signedAt: string | null;
  signatureData: string | null;
};

export default function PartnershipAgreementApprovePage({ token }: { token: string }) {
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [agreement, setAgreement] = React.useState<Agreement | null>(null);
  const [approvedByName, setApprovedByName] = React.useState("");
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/partnership-agreement/approve/${token}`);
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          setError(data?.message ?? "Agreement not found.");
          return;
        }
        const a = data.agreement as Agreement;
        setAgreement(a);
        if (a.status === "approved") setDone(true);
      } catch {
        setError("Could not load agreement.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const approve = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/partnership-agreement/approve/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedByName: approvedByName.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not approve agreement.");
        return;
      }
      setDone(true);
      toast.success("Partnership agreement approved.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center text-muted-foreground">
            {error ?? "Agreement not found."}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Approve Partnership Agreement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              <strong>{agreement.partnerName}</strong> has signed the partnership agreement for{" "}
              <strong>{agreement.brandName}</strong>.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Current ownership: <strong>{agreement.currentOwnershipPercent}%</strong>
              </li>
              <li>
                Minimum ownership: <strong>{agreement.minimumOwnershipPercent}%</strong>
              </li>
              {agreement.signedName ? (
                <li>
                  Signed by: <strong>{agreement.signedName}</strong>
                </li>
              ) : null}
            </ul>
            {agreement.signatureData ? (
              <div className="rounded-md border bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={agreement.signatureData} alt="Partner signature" className="max-h-24" />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {done || agreement.status === "approved" ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              <p className="font-medium">This partnership agreement is approved.</p>
            </CardContent>
          </Card>
        ) : agreement.status !== "pending_brand_approval" ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              This agreement is not awaiting brand approval.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="approver-name">Your name (optional)</Label>
                <Input
                  id="approver-name"
                  value={approvedByName}
                  onChange={(e) => setApprovedByName(e.target.value)}
                  placeholder="Brand representative"
                />
              </div>
              <Button className="w-full" onClick={() => void approve()} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Approve partnership
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
