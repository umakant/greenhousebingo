"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/translation-context";
import { toast } from "sonner";

type ConfirmKind = "approve" | "disable" | null;

export default function CompanyLoginActions({
  companyId,
  loginEnabled: initialLoginEnabled,
}: {
  companyId: string;
  loginEnabled: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [enabled, setEnabled] = React.useState(initialLoginEnabled);
  const [confirmKind, setConfirmKind] = React.useState<ConfirmKind>(null);

  React.useEffect(() => {
    setEnabled(initialLoginEnabled);
  }, [initialLoginEnabled]);

  async function approve() {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/approve`, {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        emailSent?: boolean;
        emailError?: string;
        alreadyApproved?: boolean;
      } | null;
      if (!res.ok || !json?.ok) {
        toast.error(json?.message ?? t("Approval failed."));
        return;
      }
      if (json.alreadyApproved) {
        toast.info(t("Login was already enabled for this company."));
        setEnabled(true);
        router.refresh();
        return;
      }
      setEnabled(true);
      if (json.emailSent) {
        toast.success(t("Company approved. A confirmation email was sent."));
      } else {
        toast.warning(
          `${t("Company approved, but the confirmation email could not be sent.")}${json.emailError ? ` ${json.emailError}` : ""}`,
        );
      }
      router.refresh();
    } catch {
      toast.error(t("Approval failed."));
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "inactive" }),
      });
      if (!res.ok) {
        toast.error(t("Failed to update status."));
        return;
      }
      setEnabled(false);
      toast.success(t("Login disabled for this company."));
      router.refresh();
    } catch {
      toast.error(t("Failed to update status."));
    } finally {
      setLoading(false);
    }
  }

  async function onConfirmAction() {
    if (confirmKind === "approve") await approve();
    else if (confirmKind === "disable") await disable();
    setConfirmKind(null);
  }

  return (
    <>
      {!enabled ? (
        <Button
          type="button"
          onClick={() => setConfirmKind("approve")}
          disabled={loading || confirmKind !== null}
        >
          {loading ? t("Updating...") : t("Approve")}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setConfirmKind("disable")}
          disabled={loading || confirmKind !== null}
        >
          {loading ? t("Updating...") : t("Disable")}
        </Button>
      )}

      <AlertDialog
        open={confirmKind !== null}
        onOpenChange={(open) => {
          if (!open && !loading) setConfirmKind(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmKind === "disable"
                ? t("Disable company login?")
                : t("Enable company login?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmKind === "disable"
                ? t(
                    "Users at this company will not be able to sign in until you enable the account again.",
                  )
                : t(
                    "This will restore sign-in access. A confirmation email may be sent to the company.",
                  )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{t("Cancel")}</AlertDialogCancel>
            <Button
              type="button"
              variant={confirmKind === "disable" ? "destructive" : "default"}
              disabled={loading}
              onClick={() => void onConfirmAction()}
            >
              {loading ? t("Updating...") : confirmKind === "disable" ? t("Disable") : t("Approve")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
