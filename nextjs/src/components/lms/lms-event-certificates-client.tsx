"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { CertificateCard } from "@/components/lms/events/certificate-card";
import { EventEmptyState } from "@/components/lms/events/event-empty-state";
import type { LmsEventCertificate } from "@/lib/lms-events/types";

export function LmsEventCertificatesClient() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [certificates, setCertificates] = React.useState<LmsEventCertificate[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/lms/event-certificates", { credentials: "include", cache: "no-store" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        certificates?: LmsEventCertificate[];
      } | null;
      if (cancelled) return;
      if (!res.ok || !data?.ok) {
        setErr(data?.message ?? "Could not load certificates.");
        setLoading(false);
        return;
      }
      setCertificates(data.certificates ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading certificates…
      </div>
    );
  }

  if (err) return <p className="text-sm text-destructive">{err}</p>;

  if (certificates.length === 0) {
    return (
      <EventEmptyState
        title="No event certificates yet"
        description="Complete certified training events to earn credentials."
        actionHref="/lms/events"
        actionLabel="Browse events"
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {certificates.map((cert) => (
        <CertificateCard
          key={cert.id}
          certificate={cert}
          onDownload={
            cert.certificateStatus === "issued"
              ? () => {
                  /* Phase 6: PDF download */
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}
