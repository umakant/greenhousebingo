"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type GateState = "loading" | "ok" | "unauthorized" | "disabled";

/** Ensures the learner is signed in and LMS is enabled before rendering student portal pages. */
export function LmsStudentPortalGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = React.useState<GateState>("loading");
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void fetch("/api/lms/public-config", { credentials: "include", cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 401) {
          setState("unauthorized");
          return;
        }
        const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
        if (!res.ok || !data?.ok) {
          setState("disabled");
          setMessage(data?.message ?? "Learning portal is not available for this organization.");
          return;
        }
        setState("ok");
      })
      .catch(() => {
        if (!cancelled) {
          setState("disabled");
          setMessage("Could not verify portal access.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (state === "unauthorized") {
      router.replace("/login?returnTo=/lms/student/dashboard");
    }
  }, [state, router]);

  if (state === "loading" || state === "unauthorized") {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === "disabled") {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-border/80 bg-card p-8 text-center">
        <h2 className="text-lg font-semibold">Unavailable</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Button variant="outline" size="sm" className="mt-6" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
