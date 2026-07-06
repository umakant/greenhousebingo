"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { toast } from "sonner";

import CompanyEditForm from "@/components/companies/company-edit-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useTranslation } from "@/contexts/translation-context";
import { resolveImpersonationRedirect } from "@/lib/launchpad/resolve-post-login-destination";
import { cn } from "@/lib/utils";

const CompanyEditDrawerContext = React.createContext<{
  openEdit: () => void;
  companyId: string;
  canImpersonate: boolean;
} | null>(null);

export function useOptionalCompanyEditDrawer() {
  return React.useContext(CompanyEditDrawerContext);
}

function useCompanyEditDrawerRequired() {
  const ctx = React.useContext(CompanyEditDrawerContext);
  if (!ctx) {
    throw new Error("useCompanyEditDrawerRequired must be used within CompanyEditDrawerProvider");
  }
  return ctx;
}

export function CompanyEditDrawerProvider({
  companyId,
  canImpersonate = false,
  children,
}: {
  companyId: string;
  /** Superadmin with `impersonate-users` (or `*`). */
  canImpersonate?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const openEdit = React.useCallback(() => setOpen(true), []);

  const value = React.useMemo(
    () => ({ openEdit, companyId, canImpersonate }),
    [openEdit, companyId, canImpersonate],
  );

  return (
    <CompanyEditDrawerContext.Provider value={value}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex h-full w-[min(92vw,640px)] max-w-[92vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
          onInteractOutside={(e) => {
            if ((e.target as HTMLElement).closest?.(".pac-container")) e.preventDefault();
          }}
        >
          <div className="shrink-0 border-b border-border px-6 pb-4 pt-6 pr-14">
            <SheetHeader>
              <SheetTitle>
                <CompanyEditDrawerSheetTitle />
              </SheetTitle>
              <SheetDescription>
                <CompanyEditDrawerSheetDescription />
              </SheetDescription>
            </SheetHeader>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-4">
            {open ? (
              <CompanyEditForm
                key={companyId}
                companyId={companyId}
                redirectOnSuccess={false}
                onSuccess={() => {
                  setOpen(false);
                  router.refresh();
                }}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </CompanyEditDrawerContext.Provider>
  );
}

function CompanyEditDrawerSheetTitle() {
  const { t } = useTranslation();
  return <>{t("Edit Company")}</>;
}

function CompanyEditDrawerSheetDescription() {
  const { t } = useTranslation();
  return <>{t("Company Information")}</>;
}

export function CompanyEditDrawerPageActions() {
  const { openEdit, companyId, canImpersonate } = useCompanyEditDrawerRequired();
  const { t } = useTranslation();
  const [impersonating, setImpersonating] = React.useState(false);

  async function handleImpersonate() {
    if (impersonating) return;
    setImpersonating(true);
    try {
      const res = await fetch("/api/auth/impersonate-form", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: companyId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        redirectUrl?: string;
        error?: string;
      };
      if (res.ok && data.success) {
        let target = data.redirectUrl ?? "/launchpad";
        try {
          target = await resolveImpersonationRedirect(target);
        } catch {
          // Cookies already set — redirect anyway.
        }
        window.location.href = target;
        return;
      }
      toast.error(data.error ?? t("Something went wrong."));
    } catch {
      toast.error(t("Something went wrong."));
    } finally {
      setImpersonating(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canImpersonate ? (
        <Button
          type="button"
          variant="outline"
          className="h-10"
          disabled={impersonating}
          onClick={() => void handleImpersonate()}
        >
          <UserRound className="mr-2 h-4 w-4" />
          {impersonating ? t("Loading...") : t("Impersonate")}
        </Button>
      ) : null}
      <Button type="button" variant="outline" className="h-10" onClick={openEdit}>
        {t("Edit")}
      </Button>
      <Button variant="outline" className="h-10" asChild>
        <Link href="/companies">{t("Back")}</Link>
      </Button>
    </div>
  );
}

type EditTriggerProps = {
  companyId: string;
  children?: React.ReactNode;
} & Pick<React.ComponentProps<typeof Button>, "variant" | "size" | "className">;

export function EditCompanyTrigger({ companyId, children, variant, size, className, ...rest }: EditTriggerProps) {
  const drawer = useOptionalCompanyEditDrawer();
  const { t } = useTranslation();
  const label = children ?? t("Edit");
  const editHref = `/companies/${companyId}/edit`;

  if (drawer) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        {...rest}
        onClick={drawer.openEdit}
      >
        {label}
      </Button>
    );
  }

  return (
    <Button variant={variant} size={size} className={className} {...rest} asChild>
      <Link href={editHref}>{label}</Link>
    </Button>
  );
}

export function EditCompanyInlineLink({
  companyId,
  className,
  children,
}: {
  companyId: string;
  className?: string;
  children: React.ReactNode;
}) {
  const drawer = useOptionalCompanyEditDrawer();

  if (drawer) {
    return (
      <button
        type="button"
        className={cn("text-primary hover:underline", className)}
        onClick={drawer.openEdit}
      >
        {children}
      </button>
    );
  }

  return (
    <Link href={`/companies/${companyId}/edit`} className={cn("text-primary hover:underline", className)}>
      {children}
    </Link>
  );
}
