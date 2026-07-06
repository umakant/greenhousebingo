"use client";

import * as React from "react";
import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/admin-t";


export function FilterButton({ showFilters, onToggle }: { showFilters: boolean; onToggle: () => void }) {
  return (
    <Button type="button" variant="outline" onClick={onToggle}>
      <Filter className="h-4 w-4 mr-2" />
      {t("Filters")}
      <span className="ml-2 text-xs text-muted-foreground">{showFilters ? t("Hide") : t("Show")}</span>
    </Button>
  );
}

