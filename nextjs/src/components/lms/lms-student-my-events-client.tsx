"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lmsMyLearningCoursePath } from "@/lib/lms-my-learning-path";

type Summary = {
  totalEvents: number;
  conductedEvents: number;
  openEvents: number;
  durationLabel: string;
};

type EventRow = {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  coverImageUrl: string | null;
  startsAt: string;
  endsAt: string;
  durationSeconds: number;
  meetingProvider: string;
  capacity: number | null;
  seatsUsed: number;
  capacityPercent: number | null;
  statusLabel: string;
  statusTone: string;
};

export function LmsStudentMyEventsClient() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [items, setItems] = React.useState<EventRow[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/lms/student/events?view=my", {
          credentials: "include",
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          message?: string;
          summary?: Summary;
          items?: EventRow[];
        } | null;
        if (cancelled) return;
        if (!res.ok || !data?.ok) {
          setErr(data?.message ?? "Could not load your events.");
          setItems([]);
          return;
        }
        setSummary(data.summary ?? null);
        setItems(Array.isArray(data.items) ? data.items : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (err) {
    return <p className="text-sm text-destructive">{err}</p>;
  }

  return (
    <div className="space-y-6">
      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total events</CardDescription>
              <CardTitle className="text-2xl">{summary.totalEvents}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Open</CardDescription>
              <CardTitle className="text-2xl">{summary.openEvents}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-2xl">{summary.conductedEvents}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total duration</CardDescription>
              <CardTitle className="text-2xl">{summary.durationLabel}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">You have no enrolled live events yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                {item.coverImageUrl ? (
                  <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-md bg-muted">
                    <Image src={item.coverImageUrl} alt="" fill className="object-cover" sizes="128px" />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.courseTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.startsAt).toLocaleString()} – {new Date(item.endsAt).toLocaleTimeString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.statusLabel}
                    {item.capacityPercent != null ? ` · ${item.capacityPercent}% full` : ""}
                  </p>
                </div>
                <Link
                  href={lmsMyLearningCoursePath({ id: item.courseId })}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Open course
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
