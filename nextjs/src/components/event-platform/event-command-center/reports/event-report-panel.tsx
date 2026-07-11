"use client";

import * as React from "react";
import { Download, FileText, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

import type { EventReportData } from "@/lib/event-platform/reports/event-report-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function EventReportPanel(props: { eventId: string }) {
  const [report, setReport] = React.useState<EventReportData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/reports`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; report?: EventReportData; message?: string };
    if (!res.ok || !data?.ok || !data.report) {
      toast.error(data?.message ?? "Could not load report.");
      setReport(null);
    } else {
      setReport(data.report);
    }
    setLoading(false);
  }, [props.eventId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading && !report) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex items-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading event report…
        </CardContent>
      </Card>
    );
  }

  if (!report) return null;

  const base = `/api/event-platform/events/${encodeURIComponent(props.eventId)}`;
  const links = report.exportLinks;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Event Report & Exports</CardTitle>
          <CardDescription>
            Unified post-event report with scorecard and downloadable exports.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" asChild>
            <a href={`${base}/reports?format=html`} target="_blank" rel="noopener noreferrer">
              <Printer className="h-3.5 w-3.5" /> Print
            </a>
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" asChild>
            <a href={links.reportPdf} download>
              <FileText className="h-3.5 w-3.5" /> PDF
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <div>
            <p className="text-xs text-muted-foreground">Post-event score</p>
            <p className="text-2xl font-bold tabular-nums">{report.scorecard.overallScore}</p>
          </div>
          <div className="flex-1 space-y-1 min-w-[200px]">
            {report.scorecard.dimensions.slice(0, 3).map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-xs">
                <span className="w-28 truncate">{d.label}</span>
                <Progress value={d.score} className="h-1.5 flex-1" />
                <span className="tabular-nums text-muted-foreground">{d.score}</span>
              </div>
            ))}
          </div>
        </div>

        {report.scorecard.recommendations.length > 0 && (
          <ul className="space-y-1 text-sm">
            {report.scorecard.recommendations.slice(0, 4).map((r) => (
              <li key={r.id} className="flex gap-2">
                <Badge variant="outline" className="shrink-0 text-[10px] capitalize">{r.priority}</Badge>
                <span><strong>{r.title}</strong> — {r.reason}</span>
              </li>
            ))}
          </ul>
        )}

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">CSV exports</p>
          <div className="flex flex-wrap gap-2">
            {[
              { href: links.attendees, label: "Attendees" },
              { href: links.financials, label: "P&L lines" },
              { href: links.financialsSummary, label: "Financial summary" },
              { href: links.winners, label: "Winners" },
              { href: links.plants, label: "Plants" },
              { href: links.plantRequests, label: "Plant requests" },
              { href: links.marketingSources, label: "Marketing" },
              { href: links.activity, label: "Activity" },
              { href: links.venueHistory, label: "Venue history" },
              { href: links.hostHistory, label: "Host history" },
            ].map((l) => (
              <Button key={l.href} size="sm" variant="secondary" className="h-7 gap-1 text-xs" asChild>
                <a href={l.href} download>
                  <Download className="h-3 w-3" /> {l.label}
                </a>
              </Button>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Recommendations are rule-based from event metrics. Generated {new Date(report.generatedAt).toLocaleString()}.
        </p>
      </CardContent>
    </Card>
  );
}
