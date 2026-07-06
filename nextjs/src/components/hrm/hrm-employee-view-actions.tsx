"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/translation-context";

export function HrmEmployeeViewPageActions({
  employeeId,
  canEdit,
}: {
  employeeId: string;
  canEdit: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      <Button variant="outline" size="sm" className="h-9" asChild>
        <Link href="/hrm/employees">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          {t("Back")}
        </Link>
      </Button>
      {canEdit ? (
        <Button
          type="button"
          variant="default"
          size="sm"
          className="h-9"
          onClick={() => router.push(`/hrm/employees?edit=${employeeId}`)}
        >
          <Pencil className="h-4 w-4 mr-1.5" />
          {t("Edit")}
        </Button>
      ) : null}
    </div>
  );
}
