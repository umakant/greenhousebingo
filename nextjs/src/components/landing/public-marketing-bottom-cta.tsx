"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PublicMarketingBottomCta({
  enableRegistration = true,
}: {
  enableRegistration?: boolean;
}) {
  return (
    <div className="mt-12 rounded-2xl border border-border bg-card px-6 py-8 text-center shadow-sm">
      <h2 className="text-xl font-semibold text-foreground">Ready to get started?</h2>
      <p className="mt-2 text-muted-foreground">
        Compare plans, start a free trial, or talk to our team about a custom setup.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="outline">
          <Link href="/pricing">View pricing</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
        {enableRegistration ? (
          <Button asChild>
            <Link href="/register">
              Start free trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
