"use client";

import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StorefrontAdminErrorAlert({ children }: { children: ReactNode }) {
  if (children == null || children === false) return null;
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
      {children}
    </div>
  );
}

export function StorefrontAdminPageShell({
  children,
  className,
}: {
  children: ReactNode;
  /** Override or extend outer width/spacing (merged with defaults). */
  className?: string;
}) {
  return <div className={cn("w-full min-w-0 space-y-6", className)}>{children}</div>;
}

export function StorefrontAdminMainCard({
  children,
  className,
  contentClassName,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("border-border/80 shadow-sm", className)}>
      <CardContent className={cn("space-y-4 p-4 sm:p-6", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
