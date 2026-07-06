"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { useTranslation } from "@/contexts/translation-context";
import { cn } from "@/lib/utils";
import { registerAppDialogs, unregisterAppDialogs } from "@/lib/app-confirm";

export type ConfirmOptions = {
  title?: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
};

type ConfirmContextValue = {
  /** Replaces `window.confirm` — resolves `true` if the user confirms. */
  confirm: (messageOrOptions: string | ConfirmOptions) => Promise<boolean>;
  /** Replaces `window.alert` — resolves when the user acknowledges. */
  alert: (message: string, options?: Pick<ConfirmOptions, "title" | "confirmLabel">) => Promise<void>;
};

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

export function useConfirmDialog(): ConfirmContextValue {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirmDialog must be used within ConfirmDialogProvider");
  }
  return ctx;
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const resolveRef = React.useRef<((value: boolean | void) => void) | null>(null);
  const settledRef = React.useRef(false);

  const [open, setOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"confirm" | "alert">("confirm");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [confirmLabel, setConfirmLabel] = React.useState("OK");
  const [cancelLabel, setCancelLabel] = React.useState("Cancel");
  const [variant, setVariant] = React.useState<"default" | "destructive">("destructive");

  const finish = React.useCallback((value: boolean | void) => {
    if (settledRef.current) return;
    settledRef.current = true;
    const fn = resolveRef.current;
    resolveRef.current = null;
    setOpen(false);
    if (fn) {
      fn(value as boolean & void);
    }
  }, []);

  const confirm = React.useCallback(
    (input: string | ConfirmOptions): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        if (resolveRef.current) {
          resolveRef.current(false);
        }
        settledRef.current = false;
        setDialogMode("confirm");
        resolveRef.current = resolve as (value: boolean | void) => void;

        const opts: ConfirmOptions = typeof input === "string" ? { description: input } : input;
        setTitle(opts.title ?? t("Confirm"));
        setDescription(opts.description);
        setConfirmLabel(opts.confirmLabel ?? t("OK"));
        setCancelLabel(opts.cancelLabel ?? t("Cancel"));
        setVariant(opts.variant ?? "destructive");
        setOpen(true);
      });
    },
    [t],
  );

  const alertFn = React.useCallback(
    (message: string, options?: Pick<ConfirmOptions, "title" | "confirmLabel">): Promise<void> => {
      return new Promise<void>((resolve) => {
        if (resolveRef.current) {
          resolveRef.current(false);
        }
        settledRef.current = false;
        setDialogMode("alert");
        resolveRef.current = resolve as (value: boolean | void) => void;

        setTitle(options?.title ?? t("Notice"));
        setDescription(message);
        setConfirmLabel(options?.confirmLabel ?? t("OK"));
        setVariant("default");
        setOpen(true);
      });
    },
    [t],
  );

  const onOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next && !settledRef.current) {
        // Alert has only OK — closing via Escape/overlay still completes the acknowledgement.
        if (dialogMode === "alert") {
          finish(undefined);
        } else {
          finish(false);
        }
      }
    },
    [dialogMode, finish],
  );

  const handleConfirm = React.useCallback(() => {
    if (dialogMode === "alert") {
      finish(undefined);
    } else {
      finish(true);
    }
  }, [dialogMode, finish]);

  const handleCancel = React.useCallback(() => {
    finish(false);
  }, [finish]);

  const value = React.useMemo(
    () => ({ confirm, alert: alertFn }),
    [confirm, alertFn],
  );

  React.useEffect(() => {
    registerAppDialogs({ confirm, alert: alertFn });
    return () => unregisterAppDialogs();
  }, [confirm, alertFn]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap">{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {dialogMode === "confirm" ? (
              <>
                <AlertDialogCancel type="button" onClick={handleCancel}>
                  {cancelLabel}
                </AlertDialogCancel>
                <AlertDialogAction
                  type="button"
                  className={cn(variant === "destructive" && buttonVariants({ variant: "destructive" }))}
                  onClick={(e) => {
                    e.preventDefault();
                    handleConfirm();
                  }}
                >
                  {confirmLabel}
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirm();
                }}
              >
                {confirmLabel}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
