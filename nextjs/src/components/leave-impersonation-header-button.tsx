"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { t } from "@/lib/admin-t";


export default function LeaveImpersonationHeaderButton() {
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
      if (res.ok) {
        window.location.href = "/companies";
      } else {
        window.location.href = "/companies";
      }
    } catch {
      window.location.href = "/companies";
    } finally {
      setLeaving(false);
    }
  }

  if (!impersonating) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 border-amber-500 text-amber-700 hover:bg-amber-500/20 hover:text-amber-800"
      onClick={handleLeave}
      disabled={leaving}
    >
      <LogOut className="h-4 w-4 mr-1.5" />
      {leaving ? t("Leaving...") : t("Leave Impersonation")}
    </Button>
  );
}
