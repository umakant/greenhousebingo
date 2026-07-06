"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/admin-t";
import { cn } from "@/lib/utils";


function rangePages(page: number, lastPage: number) {
  const pages: Array<number | "..."> = [];
  const add = (p: number | "...") => pages.push(p);
  const clamp = (n: number) => Math.max(1, Math.min(lastPage, n));

  const p = clamp(page);
  const left = Math.max(1, p - 1);
  const right = Math.min(lastPage, p + 1);

  add(1);
  if (left > 2) add("...");
  for (let i = Math.max(2, left); i <= Math.min(lastPage - 1, right); i++) add(i);
  if (right < lastPage - 1) add("...");
  if (lastPage > 1) add(lastPage);

  // Dedup
  return pages.filter((v, idx) => (idx === 0 ? true : v !== pages[idx - 1]));
}

export function Pagination({
  page,
  lastPage,
  total,
  from,
  to,
  onPageChange,
  entityLabel = "results",
  showSummary = true,
}: {
  page: number;
  lastPage: number;
  total: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
  entityLabel?: string;
  showSummary?: boolean;
}) {
  const pages = React.useMemo(() => rangePages(page, lastPage), [page, lastPage]);
  const canPrev = page > 1;
  const canNext = page < lastPage;

  return (
    <div className={cn("flex flex-col gap-2", showSummary ? "md:flex-row md:items-center md:justify-between" : "items-center")}>
      {showSummary ? (
        <div className="text-xs text-muted-foreground">
          {total === 0
            ? `${t("Showing")} 0 ${t("to")} 0 ${t("of")} 0 ${entityLabel}`
            : (
                <>
                  {t("Showing")}{" "}
                  <span>
                    {from} {t("to")} {to} {t("of")} {total} {entityLabel}
                  </span>
                </>
              )}
        </div>
      ) : null}

      <div className="flex items-center gap-1">
        <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={!canPrev}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">{t("Previous")}</span>
        </Button>

        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={`dots-${idx}`} className="px-2 text-sm text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={p}
              type="button"
              variant={p === page ? "default" : "outline"}
              size="sm"
              className="min-w-9"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          ),
        )}

        <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={!canNext}>
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">{t("Next")}</span>
        </Button>
      </div>
    </div>
  );
}

