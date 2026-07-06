"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, MapPin, Calendar } from "lucide-react";

type JobRow = {
  id: string;
  title: string;
  posting_code: string;
  description: string | null;
  application_deadline: string | null;
  job_type: string | null;
  location: string | null;
};

export function CareersPublicPage() {
  const searchParams = useSearchParams();
  const company = searchParams?.get("company")?.trim() ?? "";

  const [companyName, setCompanyName] = React.useState<string | null>(null);
  const [jobs, setJobs] = React.useState<JobRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!company) {
      setLoading(false);
      setError("Missing company link. Use the career portal URL shared by the employer.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/public/careers/jobs?company=${encodeURIComponent(company)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || "Could not load jobs");
        return j as { companyName?: string | null; jobs?: JobRow[] };
      })
      .then((j) => {
        if (cancelled) return;
        setCompanyName(j.companyName ?? null);
        setJobs(Array.isArray(j.jobs) ? j.jobs : []);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || "Could not load jobs");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [company]);

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <div className="flex items-center gap-2 text-primary">
            <Briefcase className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight">Careers</span>
          </div>
          {companyName ? (
            <h1 className="mt-3 text-2xl font-bold text-foreground">{companyName}</h1>
          ) : (
            <h1 className="mt-3 text-2xl font-bold text-foreground">Open positions</h1>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            Browse published roles and apply through the channel indicated on each listing.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {loading && (
          <p className="text-center text-sm text-muted-foreground">Loading openings…</p>
        )}
        {!loading && error && (
          <Card className="border-destructive/50">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}
        {!loading && !error && jobs.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              There are no published job openings right now. Check back later.
            </CardContent>
          </Card>
        )}
        {!loading && !error && jobs.length > 0 && (
          <ul className="space-y-4">
            {jobs.map((job) => (
              <li key={job.id}>
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg leading-snug">{job.title}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono">{job.posting_code}</p>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex flex-wrap gap-3 text-muted-foreground">
                      {job.job_type ? (
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5" />
                          {job.job_type}
                        </span>
                      ) : null}
                      {job.location ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location}
                        </span>
                      ) : null}
                      {job.application_deadline ? (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {job.application_deadline}
                        </span>
                      ) : null}
                    </div>
                    {job.description ? (
                      <p className="whitespace-pre-wrap text-foreground/90 line-clamp-6">{job.description}</p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
