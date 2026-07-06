"use client";

/**
 * Columns dropdown for list tables. Persist visibility with `useTableColumnVisibility`
 * from `@/hooks/use-table-column-visibility` (unique storage key per page).
 */

import * as React from "react";
import { Columns2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/contexts/translation-context";

export type TableColumnVisibilityDef<T extends string = string> = {
  id: T;
  /** Pre-translated label */
  label: string;
};

type Props<T extends string> = {
  columns: TableColumnVisibilityDef<T>[];
  columnVisible: (id: T) => boolean;
  setVisibility: React.Dispatch<React.SetStateAction<Record<T, boolean>>>;
  onReset: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function TableColumnVisibilityMenu<T extends string>({
  columns,
  columnVisible,
  setVisibility,
  onReset,
  open,
  onOpenChange,
}: Props<T>) {
  const { t } = useTranslation();

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8" aria-label={t("Columns")}>
          <Columns2 className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t("Columns")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t("Show columns")}</DropdownMenuLabel>
        {columns.map((c) => (
          <DropdownMenuCheckboxItem
            key={c.id}
            checked={columnVisible(c.id)}
            onCheckedChange={(checked) =>
              setVisibility((prev) => ({ ...prev, [c.id]: Boolean(checked) }))
            }
            onSelect={(e) => e.preventDefault()}
          >
            {c.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onReset();
          }}
        >
          {t("Reset to default")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
