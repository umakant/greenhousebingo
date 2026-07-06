"use client";

import * as React from "react";
import { Eye, EyeOff, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsSectionShell } from "@/components/settings/settings-section-layout";
import { t } from "@/lib/admin-t";

export function TwilioSmsSettingsSection({
  canEdit,
  onFlash,
}: {
  canEdit: boolean;
  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [showToken, setShowToken] = React.useState(false);
  const [settings, setSettings] = React.useState({
    accountSid: "",
    authToken: "",
    fromNumber: "",
  });

  React.useEffect(() => {
    let cancelled = false;
    void fetch("/api/settings/twilio", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d?.ok) return;
        setSettings({
          accountSid: String(d.accountSid ?? ""),
          authToken: String(d.authToken ?? ""),
          fromNumber: String(d.fromNumber ?? ""),
        });
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    onFlash(null);
    try {
      const res = await fetch("/api/settings/twilio", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.message ?? "Failed to save Twilio settings.");
      onFlash({ type: "success", message: "Twilio SMS settings saved." });
      toast.success(t("Twilio SMS settings saved."));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save Twilio settings.";
      onFlash({ type: "error", message });
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSectionShell
      title="Twilio SMS Settings"
      description="Configure platform Twilio credentials for OTP and transactional SMS (HRM, email verification, notifications)."
      icon={Smartphone}
      canEdit={canEdit}
      onSave={save}
      saving={saving}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">{t("Loading…")}</p>
      ) : (
        <div className="space-y-6 max-w-2xl">
          <p className="text-sm text-muted-foreground">
            {t(
              "If TWILIO_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are set in the server environment, those values take precedence over this form.",
            )}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="twilio_account_sid">{t("Account SID")}</Label>
              <Input
                id="twilio_account_sid"
                value={settings.accountSid}
                onChange={(e) => setSettings((p) => ({ ...p, accountSid: e.target.value }))}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                disabled={!canEdit}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="twilio_auth_token">{t("Auth Token")}</Label>
              <div className="relative">
                <Input
                  id="twilio_auth_token"
                  type={showToken ? "text" : "password"}
                  value={settings.authToken}
                  onChange={(e) => setSettings((p) => ({ ...p, authToken: e.target.value }))}
                  placeholder="••••••••••••••••"
                  disabled={!canEdit}
                  autoComplete="new-password"
                  className="pr-10"
                />
                {canEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowToken((v) => !v)}
                    aria-label={showToken ? t("Hide token") : t("Show token")}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="twilio_from_number">{t("From Phone Number")}</Label>
              <Input
                id="twilio_from_number"
                value={settings.fromNumber}
                onChange={(e) => setSettings((p) => ({ ...p, fromNumber: e.target.value }))}
                placeholder="+13217102191"
                disabled={!canEdit}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                {t("Use E.164 format (include country code), e.g. +1 for US numbers.")}
              </p>
            </div>
          </div>
        </div>
      )}
    </SettingsSectionShell>
  );
}
