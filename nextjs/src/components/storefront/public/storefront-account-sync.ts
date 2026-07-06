/** Dispatched when storefront customer session changes (login, logout, post-checkout account). */
export const PF_STOREFRONT_ACCOUNT_SYNC_EVENT = "pf:account:sync";

export function dispatchStorefrontAccountSync(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PF_STOREFRONT_ACCOUNT_SYNC_EVENT));
}
