import type { ConfirmOptions } from "@/contexts/confirm-dialog-context";
import { toast } from "sonner";

type ConfirmFn = (messageOrOptions: string | ConfirmOptions) => Promise<boolean>;
type AppNotifyType = "error" | "success" | "info" | "warning";
type AlertFn = (
  message: string,
  options?: Pick<ConfirmOptions, "title" | "confirmLabel"> & { type?: AppNotifyType },
) => Promise<void>;

let confirmImpl: ConfirmFn | null = null;
let alertImpl: AlertFn | null = null;

/** Called from ConfirmDialogProvider when the app shell mounts. */
export function registerAppDialogs(fns: { confirm: ConfirmFn; alert: AlertFn }) {
  confirmImpl = fns.confirm;
  alertImpl = fns.alert;
}

export function unregisterAppDialogs() {
  confirmImpl = null;
  alertImpl = null;
}

/** Replaces `window.confirm` / `confirm()` — uses the styled AlertDialog when the provider is mounted. */
export async function appConfirm(messageOrOptions: string | ConfirmOptions): Promise<boolean> {
  if (confirmImpl) return confirmImpl(messageOrOptions);
  const msg = typeof messageOrOptions === "string" ? messageOrOptions : messageOrOptions.description;
  return window.confirm(msg);
}

/** Replaces `window.alert` — uses the styled dialog when the provider is mounted. */
export async function appAlert(
  message: string,
  options?: Pick<ConfirmOptions, "title" | "confirmLabel"> & { type?: AppNotifyType },
): Promise<void> {
  const type = options?.type ?? "info";
  if (type === "error") toast.error(message);
  else if (type === "success") toast.success(message);
  else if (type === "warning") toast.warning(message);
  else toast.info(message);

  // Keep existing provider hook behavior available for consumers
  // that still rely on dialog semantics.
  if (alertImpl) return alertImpl(message, options);
}
