"use client";

import * as React from "react";

export type EventInstructorOption = {
  id: string;
  userId: string;
  displayName: string;
  headline: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  email: string | null;
};

export function useEventInstructors() {
  const [instructors, setInstructors] = React.useState<EventInstructorOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/lms/instructor-profiles", { credentials: "include", cache: "no-store" });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          items?: Array<{
            id: string;
            userId: string;
            displayName: string | null;
            headline: string | null;
            avatarUrl: string | null;
            isActive: boolean;
            user?: { name?: string | null; email?: string | null } | null;
          }>;
          message?: string;
        } | null;
        if (!res.ok || !data?.ok || !Array.isArray(data.items)) {
          if (!cancelled) {
            setInstructors([]);
            setError(data?.message ?? "Could not load instructors.");
          }
          return;
        }
        if (!cancelled) {
          setInstructors(
            data.items
              .filter((row) => row.isActive)
              .map((row) => ({
                id: row.id,
                userId: row.userId,
                displayName: row.displayName?.trim() || row.user?.name?.trim() || "Instructor",
                headline: row.headline,
                avatarUrl: row.avatarUrl,
                isActive: row.isActive,
                email: row.user?.email ?? null,
              })),
          );
        }
      } catch {
        if (!cancelled) {
          setInstructors([]);
          setError("Could not load instructors.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { instructors, loading, error };
}
