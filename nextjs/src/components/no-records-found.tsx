"use client";

import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/admin-t";


export default function NoRecordsFound({
  icon: Icon,
  title,
  description,
  hasFilters,
  onClearFilters,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  hasFilters?: boolean;
  onClearFilters?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${className ?? ""}`}>
      <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <div className="text-base font-semibold">{title}</div>
      {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
      {hasFilters && onClearFilters ? (
        <Button type="button" variant="outline" className="mt-6" onClick={onClearFilters}>
          {t("Clear filters")}
        </Button>
      ) : null}
    </div>
  );
}

