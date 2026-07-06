/**
 * Shopify Theme Editor / Customer Account UI ships `<shopify-account>` with declarative Shadow DOM.
 * That markup is not parsed when HTML is injected via `innerHTML` (React `dangerouslySetInnerHTML`),
 * and it does not run off-platform. Replace with a simple account link for Paper Flight storefronts.
 */

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function shopifyAccountFallbackHtml(accountLoginHref: string): string {
  const href = escapeHtmlAttr(accountLoginHref);
  return `<div class="pf-shopify-account-fallback"><a href="${href}" class="account-button" aria-label="Account"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 17" fill="none" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M10.375 3.813a3.063 3.063 0 1 1-6.125 0 3.063 3.063 0 0 1 6.125 0ZM7.313 9.5c-3.667 0-6.24 2.691-6.563 6.125h13.125C13.552 12.191 10.979 9.5 7.312 9.5Z"/></svg></a></div>`;
}

/** Concept mobile dock: keep the same 6-column dock layout as Home / Menu / … / Cart. */
function shopifyAccountMobileDockFallbackHtml(accountLoginHref: string): string {
  const href = escapeHtmlAttr(accountLoginHref);
  return `<a class="dock__item flex flex-col items-center justify-center gap-1d5 grow shrink-0 cursor-pointer pf-shopify-account-fallback account-button" href="${href}" data-pf-account-dock="1" aria-label="Account"><svg class="icon icon-account icon-sm" viewBox="0 0 20 20" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation"><rect x="5.5" y="1.3335" width="9" height="9" rx="4.5"></rect><path stroke-linecap="round" stroke-linejoin="round" d="M10 12.917C11.25 12.917 13.3333 13.1948 13.75 13.3337C14.1667 13.4725 16.8333 14.0003 17.5 15.0003C18.3333 16.2503 18.3333 16.667 18.3333 18.3337"></path><path stroke-linecap="round" stroke-linejoin="round" d="M10 12.917C8.75 12.917 6.66667 13.1948 6.25 13.3337C5.83333 13.4725 3.16667 14.0003 2.5 15.0003C1.66667 16.2503 1.66667 16.667 1.66667 18.3337"></path></svg><span class="text-3xs leading-none">Account</span></a>`;
}

/** @param accountLoginHref Customer sign-in URL (e.g. `/shop/account/login` or `/account/login`). */
export function replaceShopifyAccountBlocksForHeadlessStorefront(
  html: string,
  accountLoginHref: string = "/shop/account/login",
): string {
  return html.replace(/<shopify-account\b[^>]*>[\s\S]*?<\/shopify-account>/gi, (block) => {
    const openTag = block.match(/<shopify-account\b[^>]*>/i)?.[0] ?? "";
    if (/\bdock__item\b/.test(openTag)) {
      return shopifyAccountMobileDockFallbackHtml(accountLoginHref);
    }
    return shopifyAccountFallbackHtml(accountLoginHref);
  });
}
