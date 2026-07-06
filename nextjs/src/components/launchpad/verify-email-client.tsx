"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/admin-t";


export function VerifyEmailClient({
  email,
  verified: initialVerified,
}: {
  email: string;
  verified: boolean;
}) {
  const [verified, setVerified] = useState(initialVerified);
  const [sending, setSending] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  const sendVerification = async () => {
    setSending(true);
    setDevLink(null);
    try {
      const res = await fetch("/api/auth/verify-email/send", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        devLink?: string;
      };
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Failed to send verification email.");
      }
      toast.success(data.message || "Verification email sent.");
      if (data.devLink) setDevLink(data.devLink);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send verification email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/40">
          {verified ? (
            <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
          ) : (
            <Mail className="h-5 w-5 text-muted-foreground" aria-hidden />
          )}
        </div>
        <CardTitle className="mt-3">{t("Verify your email")}</CardTitle>
        <CardDescription>
          {verified
            ? t("Your email is verified. Notifications and invites will work reliably.")
            : t("Confirm your account email so notifications and invites work reliably.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{t("Email")}: </span>
          <span className="font-medium">{email}</span>
        </div>

        {verified ? (
          <Button asChild>
            <Link href="/launchpad">{t("Back to Launchpad")}</Link>
          </Button>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {t("We will send a verification link to your inbox. Open the link to complete this Launchpad step.")}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={() => void sendVerification()} disabled={sending}>
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {sending ? t("Sending…") : t("Send verification email")}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/launchpad">{t("Back to Launchpad")}</Link>
              </Button>
            </div>
            {devLink ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                <p className="font-medium">{t("Dev mode — SMTP not configured")}</p>
                <a href={devLink} className="mt-1 block break-all underline">
                  {devLink}
                </a>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
