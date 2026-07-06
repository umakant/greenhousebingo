/**
 * Replaces the Concept theme footer contact block (`footer__contact` — phone + email) with the
 * owning company's contact details. The packaged theme ships demo placeholders
 * (`tel:+21(0)987654321` / `mailto:hello@domain.com`); merchants expect their own company phone and
 * email (Profile → company `mobile_no` / `email`) to show in the storefront footer instead.
 */

export type StorefrontFooterContact = {
  phoneDisplay: string;
  phoneHref: string;
  emailDisplay: string;
  emailHref: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Builds a footer-contact payload from the owning company record; returns null when nothing usable. */
export function buildStorefrontFooterContact(
  company: { email?: string | null; mobileNo?: string | null } | null | undefined,
): StorefrontFooterContact | null {
  const phoneDisplay = (company?.mobileNo ?? "").trim();
  const emailDisplay = (company?.email ?? "").trim();
  if (!phoneDisplay && !emailDisplay) return null;

  const phoneDigits = phoneDisplay.replace(/[^\d+]/g, "");
  return {
    phoneDisplay,
    phoneHref: phoneDigits ? `tel:${phoneDigits}` : "",
    emailDisplay,
    emailHref: emailDisplay ? `mailto:${emailDisplay}` : "",
  };
}

/** Rewrites one anchor (`tel:` / `mailto:`) inside a footer-contact fragment: href + visible `btn-text`. */
function rewriteContactAnchor(
  fragment: string,
  scheme: "tel" | "mailto",
  href: string,
  display: string,
): string {
  if (!display) return fragment;
  const re = new RegExp(
    `(<a\\b[^>]*\\bhref=")${scheme}:[^"]*("[^>]*>[\\s\\S]*?<span\\b[^>]*\\bbtn-text\\b[^>]*>)[\\s\\S]*?(<\\/span>)`,
    "i",
  );
  return fragment.replace(re, `$1${escapeAttr(href)}$2${escapeHtml(display)}$3`);
}

/**
 * Applies the company contact to the footer `footer__contact` block. Scoped to that block so the
 * theme's social-share `mailto:` links are left untouched. Returns `html` unchanged if the block or
 * the contact payload is missing.
 */
export function applyStorefrontFooterContactToHtml(
  html: string,
  contact: StorefrontFooterContact | null | undefined,
): string {
  if (!html || !contact) return html;

  const marker = html.indexOf('class="footer__contact');
  if (marker === -1) return html;
  const divStart = html.lastIndexOf("<div", marker);
  if (divStart === -1) return html;
  /** No nested `<div>` lives inside `footer__contact`, so the first close tag ends the block. */
  const close = html.indexOf("</div>", marker);
  if (close === -1) return html;
  const blockEnd = close + "</div>".length;

  let block = html.slice(divStart, blockEnd);
  block = rewriteContactAnchor(block, "tel", contact.phoneHref, contact.phoneDisplay);
  block = rewriteContactAnchor(block, "mailto", contact.emailHref, contact.emailDisplay);

  return html.slice(0, divStart) + block + html.slice(blockEnd);
}
