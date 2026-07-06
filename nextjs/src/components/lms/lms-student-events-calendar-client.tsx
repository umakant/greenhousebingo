"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { LmsCalendarExportActions } from "@/components/lms/lms-calendar-export-actions";
import { Card, CardContent } from "@/components/ui/card";
import { lmsMyLearningCoursePath } from "@/lib/lms-my-learning-path";

type SessionRow = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  meetingUrl: string | null;
  meetingProvider: string;
  seatsRemaining: number | null;
  canJoin: boolean;
  course?: { id: string; title: string; slug: string };
};

export function LmsStudentEventsCalendarClient() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<SessionRow[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/lms/student/live-sessions?days=90", {
          credentials: "include",
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          message?: string;
          items?: SessionRow[];
        } | null;
        if (cancelled) return;
        if (!res.ok || !data?.ok) {
          setErr(data?.message ?? "Could not load calendar events.");
          setItems([]);
          return;
        }
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

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No upcoming live sessions in the next 90 days.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="font-medium">{item.title}</p>
              {item.course ? (
                <p className="text-sm text-muted-foreground">{item.course.title}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {new Date(item.startsAt).toLocaleString()} – {new Date(item.endsAt).toLocaleTimeString()}
              </p>
              {item.seatsRemaining != null ? (
                <p className="text-xs text-muted-foreground">{item.seatsRemaining} seats left</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {item.course ? (
                <Link
                  href={lmsMyLearningCoursePath(item.course)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Course
                </Link>
              ) : null}
              <LmsCalendarExportActions
                session={{
                  id: item.id,
                  title: item.title,
                  startsAt: item.startsAt,
                  endsAt: item.endsAt,
                  meetingUrl: item.meetingUrl,
                }}
                studentCalendarApi={`/api/lms/student/live-sessions/${item.id}/calendar`}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
