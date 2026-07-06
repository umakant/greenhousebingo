/**
 * Open the OS file dialog from a button inside Radix Sheet/Dialog.
 * Deferred one microtask so the call runs outside Radix's current dispatch stack.
 *
 * Note: `HTMLInputElement.showPicker()` for `type=file` may return `undefined` (not a Promise).
 * The previous implementation returned early in that case and never called `click()`, so the
 * dialog never opened. We always fall back to `click()` when no Promise is returned.
 */
export function openNativeFilePicker(input: HTMLInputElement | null): void {
  if (!input) return;
  queueMicrotask(() => {
    const clickFileInput = () => {
      try {
        input.click();
      } catch {
        /* ignore */
      }
    };
    try {
      if (typeof input.showPicker === "function") {
        const ret = input.showPicker() as void | Promise<void> | undefined;
        if (ret != null && typeof (ret as Promise<void>).then === "function") {
          void (ret as Promise<void>).catch(clickFileInput);
          return;
        }
        clickFileInput();
        return;
      }
    } catch {
      clickFileInput();
      return;
    }
    clickFileInput();
  });
}
