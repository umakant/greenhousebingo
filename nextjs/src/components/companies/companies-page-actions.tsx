"use client";

import * as React from "react";
import { Plus, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { t } from "@/lib/admin-t";


export default function CompaniesPageActions() {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => window.dispatchEvent(new CustomEvent("pf:companies:refresh"))}
            >
              <RefreshCcw className="h-4 w-4" />
              <span className="sr-only">{t("Refresh")}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("Refresh")}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              className="h-8 w-8"
              onClick={() => window.dispatchEvent(new CustomEvent("pf:companies:create"))}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">{t("Create Company")}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("Create Company")}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

