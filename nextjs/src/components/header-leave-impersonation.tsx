"use client";

import * as React from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/admin-t";


/**
 * Shows a "Leave impersonation" button in the header when the user is impersonating.
 */
export default function HeaderLeaveImpersonation() {
  const [impersonating, setImpersonating] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { impersonating?: boolean }) => setImpersonating(Boolean(data.impersonating)))
      .catch(() => setImpersonating(false));
  }, []);

  async function handleLeave() {
    if (leaving) return;
    setLeaving(true);
    try {
      const res = await fetch("/api/auth/leave-impersonation-form", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json().catch(() => null)) as { redirectUrl?: string } | null;
      window.location.href = json?.redirectUrl?.trim() || "/project/dashboard";
    } catch {
      window.location.href = "/project/dashboard";
    }
  }

  if (!impersonating) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 border-amber-500 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800"
      onClick={handleLeave}
      disabled={leaving}
    >
      <LogOut className="h-4 w-4 mr-1.5" />
      {leaving ? t("Leaving...") : t("Leave Impersonation")}
    </Button>
  );
}
