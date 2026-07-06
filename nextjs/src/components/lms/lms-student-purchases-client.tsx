"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { lmsMyLearningCoursePath } from "@/lib/lms-my-learning-path";

type Summary = {
  purchasedCount: number;
  totalDurationSeconds: number;
  upcomingCount: number;
  totalAmount: number;
};

type PurchaseRow = {
  enrollmentId: string;
  courseId: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  deliveryType: string;
  enrolledAt: string;
  progressPercent: number;
  isComplete: boolean;
  amountPaid: number | null;
  currency: string;
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function LmsStudentPurchasesClient() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [items, setItems] = React.useState<PurchaseRow[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/lms/student/purchases", { credentials: "include", cache: "no-store" });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          message?: string;
          summary?: Summary;
          items?: PurchaseRow[];
        } | null;
        if (cancelled) return;
        if (!res.ok || !data?.ok) {
          setErr(data?.message ?? "Could not load purchases.");
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
              <CardDescription>Purchases</CardDescription>
              <CardTitle className="text-2xl">{summary.purchasedCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total spent</CardDescription>
              <CardTitle className="text-2xl">${summary.totalAmount.toFixed(0)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Content duration</CardDescription>
              <CardTitle className="text-2xl">{formatDuration(summary.totalDurationSeconds)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active access</CardDescription>
              <CardTitle className="text-2xl">{summary.upcomingCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No purchases yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.enrollmentId}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                {item.coverImageUrl ? (
                  <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-md bg-muted">
                    <Image src={item.coverImageUrl} alt="" fill className="object-cover" sizes="128px" />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Enrolled {new Date(item.enrolledAt).toLocaleDateString()}
                      {item.amountPaid != null ? ` · ${item.currency} ${item.amountPaid.toFixed(2)}` : ""}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{item.isComplete ? "Complete" : "In progress"}</span>
                      <span>{item.progressPercent}%</span>
                    </div>
                    <Progress value={item.progressPercent} className="h-2" />
                  </div>
                </div>
                <Link
                  href={lmsMyLearningCoursePath({ id: item.courseId, slug: item.slug })}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Continue
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
