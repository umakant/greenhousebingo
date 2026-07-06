"use client";

import * as React from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ComplianceStatusBadge } from "@/components/compliance/compliance-status-badge";

type TrustPayload = {
  organizationName: string;
  sections: Record<string, { enabled?: boolean; headline?: string; body?: string }>;
  compliance: { frameworks: Array<{ code: string; name: string; auditReadyPct: number }> };
  monitoring: Array<{ name: string; category: string | null }>;
  documents: Array<{ id: number; title: string; accessLevel: string }>;
};

export default function TrustCenterPage({ slug }: { slug: string }) {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<TrustPayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch(`/api/compliance/trust/${slug}`)
      .then((r) => r.json())
      .then((d: TrustPayload & { ok?: boolean; message?: string }) => {
        if (!d.ok && d.message) {
          setError(d.message);
          return;
        }
        setData(d as TrustPayload);
      })
      .catch(() => setError("Unable to load trust center."))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center text-muted-foreground">
        {error ?? "Trust center not available."}
      </div>
    );
  }

  const sectionOrder = ["overview", "compliance", "documents", "monitoring", "security", "faq"];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{data.organizationName} Trust Center</h1>
              <p className="text-sm text-muted-foreground">Security, compliance, and privacy transparency</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        {sectionOrder.map((key) => {
          const sec = data.sections?.[key];
          if (sec && sec.enabled === false) return null;
          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-base capitalize">{sec?.headline ?? key.replace(/_/g, " ")}</CardTitle>
                {sec?.body ? <CardDescription className="whitespace-pre-wrap">{sec.body}</CardDescription> : null}
              </CardHeader>
              {key === "compliance" ? (
                <CardContent className="space-y-2">
                  {data.compliance.frameworks.map((f) => (
                    <div key={f.code} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <span>{f.name}</span>
                      <span className="text-muted-foreground">{f.auditReadyPct}% audit ready</span>
                    </div>
                  ))}
                </CardContent>
              ) : null}
              {key === "monitoring" ? (
                <CardContent className="space-y-2">
                  {data.monitoring.map((m) => (
                    <div key={m.name} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <span>{m.name}</span>
                      <ComplianceStatusBadge status="active" />
                    </div>
                  ))}
                </CardContent>
              ) : null}
              {key === "documents" ? (
                <CardContent className="space-y-2">
                  {data.documents.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                      <span>{d.title}</span>
                      <ComplianceStatusBadge status={d.accessLevel} />
                    </div>
                  ))}
                </CardContent>
              ) : null}
            </Card>
          );
        })}
      </main>
    </div>
  );
}
