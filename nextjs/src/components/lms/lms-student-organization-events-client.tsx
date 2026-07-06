"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lmsMyLearningCoursePath } from "@/lib/lms-my-learning-path";

type OrgProfile = {
  id: string;
  name: string;
  tagline: string | null;
  avatarUrl: string | null;
  courseCount: number;
  instructorCount: number;
  studentCount: number;
};

type EventItem = {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  priceLabel: string;
  eventDate: string | null;
  organizationName: string;
};

export function LmsStudentOrganizationEventsClient() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [organization, setOrganization] = React.useState<OrgProfile | null>(null);
  const [items, setItems] = React.useState<EventItem[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/lms/student/events?view=organization", {
          credentials: "include",
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          message?: string;
          organization?: OrgProfile;
          items?: EventItem[];
        } | null;
        if (cancelled) return;
        if (!res.ok || !data?.ok) {
          setErr(data?.message ?? "Could not load organization events.");
          setItems([]);
          return;
        }
        setOrganization(data.organization ?? null);
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
      {organization ? (
        <Card>
          <CardHeader>
            <CardTitle>{organization.name}</CardTitle>
            {organization.tagline ? <CardDescription>{organization.tagline}</CardDescription> : null}
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>{organization.courseCount} courses</span>
            <span>{organization.instructorCount} instructors</span>
            <span>{organization.studentCount} learners</span>
          </CardContent>
        </Card>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No public events or courses are available right now.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              {item.coverImageUrl ? (
                <div className="relative aspect-[16/10] w-full bg-muted">
                  <Image src={item.coverImageUrl} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                </div>
              ) : null}
              <CardHeader className="space-y-1">
                <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
                <CardDescription>{item.priceLabel}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {item.eventDate ? (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(item.eventDate).toLocaleString()}
                  </p>
                ) : null}
                <Link
                  href={lmsMyLearningCoursePath({ id: item.id, slug: item.slug })}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View course
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
