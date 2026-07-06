"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SensitiveProfileAction = "switch_company" | "marketplace";

export function SensitiveOtpDialog({
  open,
  onOpenChange,
  action,
  userEmail,
  onVerified,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: SensitiveProfileAction | null;
  userEmail: string;
  onVerified: (action: SensitiveProfileAction) => void;
}) {
  const [step, setStep] = React.useState<"send" | "verify">("send");
  const [otp, setOtp] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setStep("send");
      setOtp("");
      setLoading(false);
    }
  }, [open]);

  async function send() {
    if (!action) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sensitive-action/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; otp?: string; message?: string };
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      // Never show the OTP in a UI toast (it would linger on other pages and is a security risk).
      // If the server returns `otp` (local dev only, when SMTP is not set), use Network → send-otp response.
      if (data.otp) {
        toast.success(data.message || "Code generated. Email is not configured — check the send-otp response in DevTools (Network) for the code, or configure SMTP in Settings.");
      } else {
        toast.success(data.message || "Code sent.");
      }
      setStep("verify");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    if (!action) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sensitive-action/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, otp }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        switchAllowed?: boolean;
        message?: string;
      };
      if (!res.ok) throw new Error(data.error || "Verification failed");
      if (action === "switch_company" && data.switchAllowed === false) {
        toast.info(data.message || "This action is not available for your account.");
        onOpenChange(false);
        return;
      }
      toast.success("Verified.");
      const done = action;
      onOpenChange(false);
      onVerified(done);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Verify it&apos;s you</DialogTitle>
          <DialogDescription>
            {step === "send"
              ? `We will send a 6-digit code to ${userEmail}.`
              : `Enter the 6-digit code sent to ${userEmail}.`}
          </DialogDescription>
        </DialogHeader>
        {step === "verify" ? (
          <div className="space-y-2">
            <Label htmlFor="sensitive-otp">Verification code</Label>
            <Input
              id="sensitive-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="font-mono tracking-widest text-center text-lg"
              placeholder="000000"
            />
          </div>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          {step === "send" ? (
            <Button type="button" className="w-full sm:w-auto" onClick={() => void send()} disabled={loading || !action}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send code
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setStep("send")} disabled={loading}>
                Back
              </Button>
              <Button type="button" onClick={() => void verify()} disabled={loading || otp.length < 6}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verify
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type CompanyRow = { id: string; name: string; email: string };

export function SwitchCompanyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [companies, setCompanies] = React.useState<CompanyRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [switching, setSwitching] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/switchable-companies?q=${encodeURIComponent(q)}`);
      const data = (await res.json().catch(() => ({}))) as { error?: string; companies?: CompanyRow[] };
      if (!res.ok) throw new Error(data.error || "Failed to load companies");
      setCompanies(Array.isArray(data.companies) ? data.companies : []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [open, load]);

  React.useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  async function selectCompany(id: string) {
    setSwitching(id);
    try {
      const res = await fetch("/api/auth/impersonate-after-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: id }),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string; redirectUrl?: string };
      if (!res.ok || !data.success) throw new Error(data.error || "Could not switch company");
      toast.success("Switched company.");
      onOpenChange(false);
      const { resolveImpersonationRedirect } = await import("@/lib/launchpad/resolve-post-login-destination");
      const target = await resolveImpersonationRedirect(data.redirectUrl || "/launchpad");
      router.push(target);
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Switch failed");
    } finally {
      setSwitching(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Switch company</DialogTitle>
          <DialogDescription>Search and select a company account to open.</DialogDescription>
        </DialogHeader>
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-2" />
        <div className="flex-1 overflow-y-auto border rounded-md divide-y min-h-[200px] max-h-[50vh]">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          ) : companies.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No companies found.</div>
          ) : (
            companies.map((c) => (
              <div key={c.id} className="flex items-center gap-2 p-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.email || "—"}</div>
                </div>
                <span className="text-xs text-muted-foreground font-mono tabular-nums shrink-0">{c.id}</span>
                <Button size="sm" className="shrink-0" disabled={switching !== null} onClick={() => void selectCompany(c.id)}>
                  {switching === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Select"}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
