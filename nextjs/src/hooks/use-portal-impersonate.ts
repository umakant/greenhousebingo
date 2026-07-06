"use client";

import * as React from "react";
import { toast } from "sonner";

import { resolveImpersonationRedirect } from "@/lib/launchpad/resolve-post-login-destination";
import { t } from "@/lib/admin-t";


export type LmsPortalImpersonateKind = "student" | "instructor";

export function usePortalImpersonate(
  opts?: { returnPath?: string; lmsPortal?: LmsPortalImpersonateKind } | string,
) {
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const returnPath = typeof opts === "string" ? opts : opts?.returnPath;
  const lmsPortal = typeof opts === "string" ? undefined : opts?.lmsPortal;

  const impersonate = React.useCallback(
    async (userId: string) => {
      if (!userId || loadingId) return;
      setLoadingId(userId);
      try {
        const res = await fetch("/api/auth/impersonate-portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            userId,
            returnPath: returnPath ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
            lmsPortal,
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          success?: boolean;
          redirectUrl?: string;
          error?: string;
        } | null;
        if (!res.ok || !json?.success) {
          toast.error(json?.error ?? t("Impersonation failed"));
          return;
        }
        if (json.redirectUrl) {
          let target = json.redirectUrl;
          try {
            target = await resolveImpersonationRedirect(json.redirectUrl);
          } catch {
            // Cookies already set — redirect anyway.
          }
          window.location.href = target;
        }
      } catch {
        toast.error(t("Impersonation failed"));
      } finally {
        setLoadingId(null);
      }
    },
    [loadingId, returnPath, lmsPortal],
  );

  return { impersonate, loadingId, isLoading: (id: string) => loadingId === id };
}
