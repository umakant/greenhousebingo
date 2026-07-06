"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { t } from "@/lib/admin-t";


export default function HelpdeskCategoriesActions({ canCreate }: { canCreate: boolean }) {
  if (!canCreate) return null;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            onClick={() => {
              window.dispatchEvent(new Event("pf:helpdesk-categories:create"));
            }}
            aria-label={t("Create")}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("Create")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

