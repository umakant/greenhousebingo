"use client";

import * as React from "react";

import { EmMatterWorkspaceShell } from "@/components/expense-management/em-matter-workspace-shell";
import { useTranslation } from "@/contexts/translation-context";

export function EmMatterStubClient({
  active,
  title,
  description,
}: {
  active: "notes" | "documents" | "timeline";
  title: string;
  description: string;
}) {
  const { t: tLang } = useTranslation();
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);

  return (
    <EmMatterWorkspaceShell active={active} panelTitle={t(title)}>
      <p className="text-sm text-muted-foreground">{t(description)}</p>
    </EmMatterWorkspaceShell>
  );
}
