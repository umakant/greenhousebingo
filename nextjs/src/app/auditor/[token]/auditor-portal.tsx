"use client";

import * as React from "react";
import { Download, Loader2, MessageSquare, Shield } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AuditorSession = {
  auditorName: string;
  organizationName: string | null;
  audit: { name: string; auditType: string } | null;
};

export default function AuditorPortalPage({ token }: { token: string }) {
  const [loading, setLoading] = React.useState(true);
  const [session, setSession] = React.useState<AuditorSession | null>(null);
  const [counts, setCounts] = React.useState({ evidence: 0, controls: 0, policies: 0, documents: 0 });
  const [tab, setTab] = React.useState<"evidence" | "controls" | "policies" | "documents">("evidence");
  const [items, setItems] = React.useState<Array<{ id: number; title: string }>>([]);
  const [comment, setComment] = React.useState("");
  const [requestTitle, setRequestTitle] = React.useState("");

  React.useEffect(() => {
    fetch(`/api/compliance/auditor/${token}`)
      .then((r) => r.json())
      .then((d: { ok?: boolean; session?: AuditorSession; counts?: typeof counts }) => {
        if (d.ok && d.session) {
          setSession(d.session);
          setCounts(d.counts ?? counts);
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  React.useEffect(() => {
    fetch(`/api/compliance/auditor/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", resource: tab }),
    })
      .then((r) => r.json())
      .then((d: { ok?: boolean; items?: Array<{ id: number; title: string }> }) => {
        if (d.ok) setItems(d.items ?? []);
      });
  }, [token, tab]);

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/compliance/auditor/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) toast.success("Submitted");
    else toast.error((data as { message?: string }).message ?? "Failed");
    return data;
  };

  const exportPackage = async () => {
    const data = await post({ action: "export" });
    if (data.package) {
      const blob = new Blob([JSON.stringify(data.package, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "audit-evidence-package.json";
      a.click();
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!session) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Invalid or expired auditor access.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Auditor Portal</h1>
            <p className="text-sm text-muted-foreground">
              {session.organizationName} · {session.auditorName}
              {session.audit ? ` · ${session.audit.name}` : ""}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-6 py-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap gap-2">
            {(["evidence", "controls", "policies", "documents"] as const).map((t) => (
              <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t)}>
                {t} ({counts[t]})
              </Button>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base capitalize">Review {tab}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="rounded border px-3 py-2 text-sm">{item.title}</div>
              ))}
              {items.length === 0 ? <p className="text-sm text-muted-foreground">No auditor-visible {tab}.</p> : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" /> Leave comment</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Audit observation..." />
              <Button className="w-full" size="sm" onClick={() => void post({
                action: "comment",
                entityType: tab.slice(0, -1),
                entityId: items[0]?.id ?? 0,
                body: comment,
              }).then(() => setComment(""))}>
                Post comment
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Request evidence</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Input value={requestTitle} onChange={(e) => setRequestTitle(e.target.value)} placeholder="Request title" />
              <Button className="w-full" size="sm" variant="outline" onClick={() => void post({
                action: "request_evidence",
                title: requestTitle || "Additional evidence",
              })}>
                Submit request
              </Button>
            </CardContent>
          </Card>
          <Button className="w-full" onClick={() => void exportPackage()}>
            <Download className="mr-2 h-4 w-4" /> Export evidence package
          </Button>
          <p className="text-xs text-muted-foreground">
            Read-only access. You cannot edit company records, change settings, or view other tenants.
          </p>
        </div>
      </main>
    </div>
  );
}
