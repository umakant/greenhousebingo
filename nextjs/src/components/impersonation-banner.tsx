"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/admin-t";


type Props = { userName?: string | null };

export default function ImpersonationBanner({ userName }: Props) {
  const [impersonating, setImpersonating] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data: { impersonating?: boolean }) => setImpersonating(Boolean(data.impersonating)))
      .catch(() => setImpersonating(false));
  }, []);

  async function handleLeave() {
    setLeaving(true);
    try {
      const res = await fetch("/api/auth/leave-impersonation", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { redirect?: string };
      if (res.ok && data.redirect) {
        window.location.href = data.redirect;
        return;
      }
    } finally {
      setLeaving(false);
    }
  }

  if (!impersonating) return null;

  return (
    <div className="sticky top-0 z-[100] bg-amber-500/95 text-amber-950 text-sm font-medium px-3 py-2 flex items-center justify-center gap-3 flex-wrap shadow-md">
      <span>
        {t("Viewing as")} <strong>{userName ?? t("User")}</strong>
      </span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-7 bg-amber-950 text-amber-100 hover:bg-amber-900"
        onClick={handleLeave}
        disabled={leaving}
      >
        {leaving ? t("Leaving...") : t("Leave Impersonation")}
      </Button>
    </div>
  );
}
