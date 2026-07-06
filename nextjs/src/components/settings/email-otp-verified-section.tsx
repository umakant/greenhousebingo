"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Mail, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/phone";
import { t } from "@/lib/admin-t";

type OtpStatus = {
  email: string;
  emailVerifiedAt: string;
  phone: string;
  phoneVerifiedAt: string;
};

function formatVerifiedDateTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function VerificationStatus({
  verified,
  verifiedAt,
  label,
}: {
  verified: boolean;
  verifiedAt: string;
  label: string;
}) {
  return (
    <div
      className={cn(
        "mt-4 rounded-md border px-3 py-2.5 text-sm",
        verified
          ? "border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
          : "border-border bg-muted/30 text-muted-foreground",
      )}
    >
      <div className="flex items-start gap-2">
        {verified ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
        ) : (
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 opacity-50" aria-hidden />
        )}
        <div>
          {verified ? (
            <>
              <p className="font-medium text-emerald-800 dark:text-emerald-200">{t("Verified")}</p>
              <p className="mt-0.5 text-xs">
                {label}: {formatVerifiedDateTime(verifiedAt)}
              </p>
            </>
          ) : (
            <p>{t("Not verified yet")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function OtpChannelCard({
  type,
  title,
  icon: Icon,
  canEdit,
  value,
  onValueChange,
  verifiedValue,
  verifiedAt,
  placeholder,
  inputType = "text",
  onVerified,
}: {
  type: "email" | "phone";
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  canEdit: boolean;
  value: string;
  onValueChange: (v: string) => void;
  verifiedValue: string;
  verifiedAt: string;
  placeholder: string;
  inputType?: string;
  onVerified: (verifiedAt: string) => void;
}) {
  const [otpSent, setOtpSent] = React.useState(false);
  const [otpInput, setOtpInput] = React.useState("");
  const [loading, setLoading] = React.useState<"send" | "verify" | null>(null);

  const normalizedCurrent =
    type === "email" ? value.trim().toLowerCase() : value.replace(/\D/g, "");
  const normalizedVerified =
    type === "email" ? verifiedValue.trim().toLowerCase() : verifiedValue.replace(/\D/g, "");
  const isVerified = Boolean(normalizedVerified && normalizedVerified === normalizedCurrent && verifiedAt);

  React.useEffect(() => {
    setOtpSent(false);
    setOtpInput("");
  }, [value]);

  const sendOtp = async () => {
    if (!value.trim() || !canEdit) return;
    setLoading("send");
    try {
      const res = await fetch("/api/settings/email/otp/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value }),
      });
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) throw new Error(String(data?.message ?? "Failed to send OTP"));
      setOtpSent(true);
      toast.success(String(data?.message ?? t("OTP sent")));
      if (typeof data?.otp === "string") {
        toast.info(`${t("OTP")}: ${data.otp}`, { duration: 30000 });
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("Failed to send OTP"));
    } finally {
      setLoading(null);
    }
  };

  const verifyOtp = async () => {
    if (!otpInput.trim() || !canEdit) return;
    setLoading("verify");
    try {
      const res = await fetch("/api/settings/email/otp/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value, otp: otpInput }),
      });
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) throw new Error(String(data?.message ?? "Invalid OTP"));
      const at = typeof data?.verifiedAt === "string" ? data.verifiedAt : new Date().toISOString();
      onVerified(at);
      setOtpSent(false);
      setOtpInput("");
      toast.success(t("Verified successfully"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("Verification failed"));
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="h-full">
      <CardContent className="pt-6">
        <div className="mb-4 flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-base font-medium">{title}</h3>
        </div>

        <div className="space-y-1.5">
          <Label className="font-medium">{type === "email" ? t("Email Address") : t("Phone Number")}</Label>
          <div className="flex items-center gap-2">
            <Input
              type={inputType}
              value={value}
              onChange={(e) => onValueChange(type === "phone" ? formatPhone(e.target.value) : e.target.value)}
              placeholder={placeholder}
              disabled={!canEdit}
              className="flex-1"
            />
            {isVerified ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden />
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 gap-1"
                disabled={!canEdit || !value.trim() || loading === "send"}
                onClick={() => void sendOtp()}
              >
                {loading === "send" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                {t("Send OTP")}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {type === "email"
              ? t("Send a one-time code to confirm this email can receive mail from your SMTP settings.")
              : t("Send a one-time code via SMS to confirm this number (Twilio SMS settings).")}
          </p>
        </div>

        {otpSent && !isVerified ? (
          <div className="mt-4 flex items-center gap-2">
            <Input
              placeholder={t("Enter 6-digit OTP")}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              className="flex-1 font-mono tracking-widest"
              disabled={!canEdit}
            />
            <Button
              type="button"
              size="sm"
              disabled={!canEdit || otpInput.length < 6 || loading === "verify"}
              onClick={() => void verifyOtp()}
            >
              {loading === "verify" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("Verify")}
            </Button>
          </div>
        ) : null}

        <VerificationStatus
          verified={isVerified}
          verifiedAt={verifiedAt}
          label={t("Verified date and time")}
        />
      </CardContent>
    </Card>
  );
}

export function EmailOtpVerifiedSection({
  canEdit,
  defaultEmail = "",
  defaultPhone = "",
  initialStatus,
}: {
  canEdit: boolean;
  defaultEmail?: string;
  defaultPhone?: string;
  initialStatus?: Partial<OtpStatus>;
}) {
  const [status, setStatus] = React.useState<OtpStatus>({
    email: initialStatus?.email ?? "",
    emailVerifiedAt: initialStatus?.emailVerifiedAt ?? "",
    phone: initialStatus?.phone ?? "",
    phoneVerifiedAt: initialStatus?.phoneVerifiedAt ?? "",
  });
  const [email, setEmail] = React.useState(defaultEmail);
  const [phone, setPhone] = React.useState(defaultPhone ? formatPhone(defaultPhone) : "");

  React.useEffect(() => {
    let cancelled = false;
    void fetch("/api/settings/email/otp/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d?.ok) return;
        setStatus({
          email: d.email ?? "",
          emailVerifiedAt: d.emailVerifiedAt ?? "",
          phone: d.phone ?? "",
          phoneVerifiedAt: d.phoneVerifiedAt ?? "",
        });
        const userEmail = typeof d.userEmail === "string" ? d.userEmail.trim() : "";
        const userPhone = typeof d.userPhone === "string" ? d.userPhone.trim() : "";
        setEmail(userEmail || defaultEmail);
        setPhone(formatPhone(userPhone || defaultPhone));
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [defaultEmail, defaultPhone]);

  React.useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#otp-verified") return;
    const el = document.getElementById("otp-verified");
    if (!el) return;
    const timer = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div id="otp-verified" className="mt-6 scroll-mt-24 space-y-4 border-t pt-8">
      <div>
        <h3 className="text-lg font-semibold">{t("OTP Verified")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Verify your email address and phone number with one-time codes before going live.")}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <OtpChannelCard
          type="email"
          title={t("Email Address")}
          icon={Mail}
          canEdit={canEdit}
          value={email}
          onValueChange={setEmail}
          verifiedValue={status.email}
          verifiedAt={status.emailVerifiedAt}
          placeholder="email@example.com"
          inputType="email"
          onVerified={(verifiedAt) =>
            setStatus((s) => ({
              ...s,
              email: email.trim().toLowerCase(),
              emailVerifiedAt: verifiedAt,
            }))
          }
        />
        <OtpChannelCard
          type="phone"
          title={t("OTP Number")}
          icon={Smartphone}
          canEdit={canEdit}
          value={phone}
          onValueChange={setPhone}
          verifiedValue={status.phone}
          verifiedAt={status.phoneVerifiedAt}
          placeholder="(000) 000-0000"
          onVerified={(verifiedAt) =>
            setStatus((s) => ({
              ...s,
              phone: phone.replace(/\D/g, ""),
              phoneVerifiedAt: verifiedAt,
            }))
          }
        />
      </div>
    </div>
  );
}
