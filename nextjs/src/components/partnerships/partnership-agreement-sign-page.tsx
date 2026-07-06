"use client";

import * as React from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  HelpCircle,
  Loader2,
  Lock,
  Mail,
  PenLine,
  PieChart,
  Plane,
  RefreshCw,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { SignaturePad } from "@/components/form-builder/signature-pad";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Agreement = {
  status: string;
  partnerName: string;
  partnerEmail: string | null;
  brandName: string;
  brandLogo: string | null;
  currentOwnershipPercent: number;
  minimumOwnershipPercent: number;
  availableOwnershipPercent: number;
  signedAt: string | null;
  signedName: string | null;
  requestId: string;
  invitedBy: string;
  sentOn: string;
  linkExpiresAt: string;
};

const APP_NAME = (process.env.NEXT_PUBLIC_APP_NAME ?? "SECURX").trim() || "SECURX";
const COMPANY_NAME = (process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Paper Flight").trim() || "Paper Flight";
const SUPPORT_EMAIL = (process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@paperflight.cc").trim();

function SecurxWordmark() {
  if (/securx/i.test(APP_NAME)) {
    return (
      <span className="text-xl font-extrabold tracking-[0.12em] text-slate-900">
        SECUR<span className="text-[#e31837]">X</span>
      </span>
    );
  }
  return <span className="text-xl font-extrabold tracking-wide text-slate-900">{APP_NAME}</span>;
}

function formatSentOn(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function daysUntilExpiry(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function statusBadge(status: string) {
  if (status === "pending_signature") {
    return (
      <Badge className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-amber-800 hover:bg-amber-50">
        Pending Signature
      </Badge>
    );
  }
  if (status === "pending_brand_approval") {
    return (
      <Badge className="rounded-full border-sky-200 bg-sky-50 px-3 py-1 text-sky-800 hover:bg-sky-50">
        Pending Brand Approval
      </Badge>
    );
  }
  if (status === "approved") {
    return (
      <Badge className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800 hover:bg-emerald-50">
        Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="destructive" className="rounded-full px-3 py-1">
        Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="rounded-full px-3 py-1 capitalize">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <div className="mt-0.5 text-sm font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function OwnershipCard({
  title,
  value,
  description,
  tone,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  tone?: "blue" | "green" | "purple" | "orange";
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function TermRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-slate-600">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <span>{children}</span>
    </li>
  );
}

export default function PartnershipAgreementSignPage({ token }: { token: string }) {
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [agreement, setAgreement] = React.useState<Agreement | null>(null);
  const [signedName, setSignedName] = React.useState("");
  const [signatureData, setSignatureData] = React.useState("");
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const signaturePadKey = React.useRef(0);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/partnership-agreement/${token}`);
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          setError(data?.message ?? "Agreement not found.");
          return;
        }
        const a = data.agreement as Agreement;
        setAgreement(a);
        setSignedName(a.signedName ?? a.partnerName ?? "");
        if (a.status !== "pending_signature") setDone(true);
      } catch {
        setError("Could not load agreement.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const clearSignature = () => {
    setSignatureData("");
    signaturePadKey.current += 1;
  };

  const submit = async () => {
    if (!signedName.trim()) {
      toast.error("Enter your printed name.");
      return;
    }
    if (!signatureData.trim()) {
      toast.error("Draw your signature.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/partnership-agreement/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedName, signatureData }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not submit signature.");
        return;
      }
      setDone(true);
      toast.success("Agreement signed. Sent to the brand for approval.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading agreement…
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center text-muted-foreground">
            {error ?? "Agreement not found."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const expiryDays = daysUntilExpiry(agreement.linkExpiresAt);
  const showForm = !done && agreement.status === "pending_signature";

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <SecurxWordmark />
            <span className="hidden h-4 w-px bg-slate-200 sm:block" />
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              <Plane className="h-4 w-4 text-sky-600" />
              Powered by {COMPANY_NAME}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
              <Shield className="h-3.5 w-3.5 text-sky-600" />
              Secure Document
            </span>
            <Select defaultValue="en">
              <SelectTrigger className="h-9 w-[120px] border-slate-200 bg-white">
                <Globe className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        {/* Hero */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Secure Partnership Agreement
                </h1>
                <p className="text-sm text-slate-500 sm:text-base">
                  Review and sign your brand partnership agreement
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {statusBadge(done ? "pending_brand_approval" : agreement.status)}
                  <Badge variant="outline" className="rounded-full border-sky-200 bg-sky-50 px-3 py-1 text-sky-800">
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                    Request ID: {agreement.requestId}
                  </Badge>
                </div>
              </div>
            </div>
            {showForm ? (
              <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 lg:max-w-xs">
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Secure Link</p>
                    <p className="mt-1 text-sm text-emerald-800">
                      This secure link will expire in{" "}
                      <strong>{expiryDays} day{expiryDays === 1 ? "" : "s"}</strong>
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {done ? (
          <section className="rounded-2xl border border-emerald-200 bg-white p-10 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
            <h2 className="mt-4 text-xl font-semibold text-slate-900">Agreement submitted</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
              Thank you — your signed agreement has been sent to {agreement.brandName} for brand
              approval. You will be notified once the partnership is activated.
            </p>
          </section>
        ) : null}

        {/* Agreement Summary */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
            <FileText className="h-5 w-5 text-sky-600" />
            <h2 className="text-base font-semibold text-slate-900">Agreement Summary</h2>
          </div>
          <CardContent className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
            <SummaryItem
              icon={<Building2 className="h-4 w-4" />}
              label="Brand"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Plane className="h-3.5 w-3.5 text-sky-600" />
                  {agreement.brandName}
                </span>
              }
            />
            <SummaryItem
              icon={<User className="h-4 w-4" />}
              label="Partner"
              value={agreement.partnerName}
            />
            <SummaryItem
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              value={agreement.partnerEmail ?? "—"}
            />
            <SummaryItem
              icon={<UserPlus className="h-4 w-4" />}
              label="Invited By"
              value={agreement.invitedBy}
            />
            <SummaryItem
              icon={<Calendar className="h-4 w-4" />}
              label="Sent On"
              value={formatSentOn(agreement.sentOn)}
            />
            <SummaryItem
              icon={<Clock className="h-4 w-4" />}
              label="Status"
              value={statusBadge(agreement.status)}
            />
          </CardContent>
        </section>

        {/* Ownership Details */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
            <PieChart className="h-5 w-5 text-sky-600" />
            <h2 className="text-base font-semibold text-slate-900">Ownership Details</h2>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
            <OwnershipCard
              tone="blue"
              title="Current Ownership"
              value={`${agreement.currentOwnershipPercent}%`}
              description={`Your current ownership in ${agreement.brandName}`}
              icon={<PieChart className="h-4 w-4 opacity-60" />}
            />
            <OwnershipCard
              tone="green"
              title="Minimum Protected Ownership"
              value={`${agreement.minimumOwnershipPercent}%`}
              description="Your minimum protected ownership"
              icon={<Shield className="h-4 w-4 opacity-60" />}
            />
            <OwnershipCard
              tone="purple"
              title="Available Ownership"
              value={`${agreement.availableOwnershipPercent}%`}
              description="Additional ownership available to you"
              icon={<PieChart className="h-4 w-4 opacity-60" />}
            />
            <OwnershipCard
              tone="orange"
              title="Ownership Status"
              value="Pending"
              description="Pending approval from brand administrators"
              icon={<RefreshCw className="h-4 w-4 opacity-60" />}
            />
          </div>
        </section>

        {/* Agreement Terms */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
            <ShieldCheck className="h-5 w-5 text-sky-600" />
            <h2 className="text-base font-semibold text-slate-900">Agreement Terms</h2>
          </div>
          <div className="space-y-4 p-6">
            <p className="text-sm text-slate-600">By signing this agreement, you confirm:</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <ul className="space-y-3">
                <TermRow>I accept the ownership percentage shown above</TermRow>
                <TermRow>I understand my minimum protected ownership</TermRow>
                <TermRow>I agree to the partnership terms and conditions</TermRow>
              </ul>
              <ul className="space-y-3">
                <TermRow>I understand my signature will be time-stamped</TermRow>
                <TermRow>I understand this agreement will be recorded in ownership history</TermRow>
              </ul>
            </div>
          </div>
        </section>

        {/* Signature */}
        {showForm ? (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
              <PenLine className="h-5 w-5 text-sky-600" />
              <h2 className="text-base font-semibold text-slate-900">Signature</h2>
            </div>
            <div className="space-y-5 p-6">
              <div className="space-y-2">
                <Label htmlFor="signed-name" className="text-sm font-semibold text-slate-800">
                  Printed Name *
                </Label>
                <Input
                  id="signed-name"
                  value={signedName}
                  onChange={(e) => setSignedName(e.target.value)}
                  autoComplete="name"
                  className="h-11 border-slate-200 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-800">Signature *</Label>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <SignaturePad
                    key={signaturePadKey.current}
                    value={signatureData}
                    onChange={setSignatureData}
                    hideClearButton
                    className="min-h-[180px] rounded-none border-0"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Sign above using your mouse, touchpad, or touchscreen
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-slate-200"
                  onClick={clearSignature}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Signature
                </Button>
              </div>
              <Button
                className="h-12 w-full bg-sky-600 text-base font-semibold hover:bg-sky-700"
                onClick={() => void submit()}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-5 w-5" />
                )}
                Sign &amp; Submit Agreement
              </Button>
            </div>
          </section>
        ) : null}

        {/* Footer */}
        <footer className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-3">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Shield className="h-4 w-4 text-sky-600" />
              Your Security Matters
            </p>
            <p className="text-xs leading-relaxed text-slate-500">
              This agreement is encrypted, securely stored, time-stamped, and fully auditable in
              the partnership ownership history.
            </p>
          </div>
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <HelpCircle className="h-4 w-4 text-sky-600" />
              Need Help?
            </p>
            <p className="text-xs leading-relaxed text-slate-500">
              Contact us at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-sky-600 hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Plane className="h-4 w-4 text-sky-600" />
              Powered by {COMPANY_NAME}
            </p>
            <p className="text-xs leading-relaxed text-slate-500">
              {APP_NAME} Partnership Management © {new Date().getFullYear()} {APP_NAME}. All rights
              reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
