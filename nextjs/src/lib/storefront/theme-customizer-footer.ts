/**
 * Merchant-editable footer for Concept static HTML (`footer-group` — main band + copyright bar).
 */

export type FooterLinkRow = {
  id: string;
  label: string;
  href: string;
};

export type FooterSocialPlatform =
  | "facebook"
  | "twitter"
  | "instagram"
  | "youtube"
  | "pinterest"
  | "tiktok"
  | "linkedin";

export type FooterSocialLinkRow = {
  id: string;
  platform: FooterSocialPlatform;
  url: string;
};

/** Options for the footer customizer social list (icon + URL per row). */
export const FOOTER_SOCIAL_PLATFORM_OPTIONS: ReadonlyArray<{ value: FooterSocialPlatform; label: string }> = [
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "X (Twitter)" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "pinterest", label: "Pinterest" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
];

export type FooterCustomizerState = {
  /** Theme `--color-background` triplet, e.g. `30 64 175` */
  mainBackgroundRgb: string;
  logoImageUrl: string;
  columnATitle: string;
  columnALinks: FooterLinkRow[];
  columnBTitle: string;
  columnBLinks: FooterLinkRow[];
  phoneDisplay: string;
  phoneHref: string;
  emailDisplay: string;
  emailHref: string;
  newsletterHeading: string;
  newsletterPlaceholder: string;
  /** Preferred: repeated footer icons + URLs. When non-empty, replaces the legacy quartet below for rendering. */
  socialLinks: FooterSocialLinkRow[];
  socialFacebook: string;
  socialTwitter: string;
  socialInstagram: string;
  socialYoutube: string;
  /** Trusted HTML inside `.rte.credits` (copyright line + optional links). */
  copyrightHtml: string;
  subFooterBackgroundRgb: string;
  hideLocalization: boolean;
  hidePaymentIcons: boolean;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/\r?\n/g, " ");
}

/** Index past `<div>` open tag starting at `openBracket`, or -1. */
function findMatchingDivClose(html: string, openBracket: number): number {
  let depth = 0;
  let i = openBracket;
  while (i < html.length) {
    if (html[i] !== "<") {
      i++;
      continue;
    }
    if (/^<div\b/i.test(html.slice(i))) {
      depth++;
      const gt = html.indexOf(">", i);
      if (gt === -1) return -1;
      i = gt + 1;
      continue;
    }
    if (/^<\/div>/i.test(html.slice(i))) {
      depth--;
      i += 6;
      if (depth === 0) return i;
      continue;
    }
    i++;
  }
  return -1;
}

const MAIN_FOOTER_OPEN_RE =
  /<div\b[^>]*\bid="shopify-section-sections--[^"]+__footer"\b[^>]*\bclass="[^"]*shopify-section-group-footer-group[^"]*"[^>]*>/i;

const COPYRIGHT_FOOTER_OPEN_RE =
  /<div\b[^>]*\bid="shopify-section-sections--[^"]+__footer-copyright"\b[^>]*\bclass="[^"]*shopify-section-group-footer-group[^"]*"[^>]*>/i;

function findSectionBounds(html: string, openRe: RegExp): { start: number; end: number } | null {
  const m = openRe.exec(html);
  if (!m || m.index === undefined) return null;
  const start = m.index;
  const end = findMatchingDivClose(html, start);
  if (end === -1) return null;
  return { start, end };
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseLinksFromUl(fragment: string): Array<{ label: string; href: string }> {
  const out: Array<{ label: string; href: string }> = [];
  const re = /<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let x: RegExpExecArray | null;
  while ((x = re.exec(fragment))) {
    out.push({ href: x[1] ?? "#", label: stripTags(x[2] ?? "") });
  }
  return out;
}

function parseDetailBlocks(mainSectionHtml: string): Array<{ title: string; links: Array<{ label: string; href: string }> }> {
  const blocks: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [];
  const re = /<details\b[^>]*class="[^"]*footer__item[^"]*"[^>]*>([\s\S]*?)<\/details>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(mainSectionHtml))) {
    const chunk = m[1] ?? "";
    const sum = chunk.match(
      /<summary[^>]*>[\s\S]*?<span[^>]*class="[^"]*heading[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
    );
    const title = sum?.[1] ? stripTags(sum[1]) : "";
    const ul = chunk.match(/<ul\b[^>]*class="[^"]*flex\s+flex-col\s+gap-3[^"]*"[^>]*>([\s\S]*?)<\/ul>/i);
    const links = ul?.[1] ? parseLinksFromUl(ul[1]) : [];
    blocks.push({ title, links });
  }
  return blocks;
}

function discoverSocialHref(htmlFragment: string, iconClass: string): string {
  const re = new RegExp(
    `<a\\b[^>]*\\bhref="([^"]*)"[^>]*>[\\s\\S]*?<svg\\b[^>]*\\bclass="[^"]*${iconClass}[^"]*"`,
    "i",
  );
  const m = re.exec(htmlFragment);
  return m?.[1]?.trim() ?? "";
}

const FOOTER_SOCIAL_PLATFORM_SET = new Set<FooterSocialPlatform>(
  FOOTER_SOCIAL_PLATFORM_OPTIONS.map((x) => x.value),
);

function isFooterSocialPlatform(v: unknown): v is FooterSocialPlatform {
  return typeof v === "string" && FOOTER_SOCIAL_PLATFORM_SET.has(v as FooterSocialPlatform);
}

function parseFooterSocialLinks(arr: unknown): FooterSocialLinkRow[] {
  if (!Array.isArray(arr)) return [];
  const rows: FooterSocialLinkRow[] = [];
  for (const row of arr) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : "";
    if (!id || !isFooterSocialPlatform(r.platform)) continue;
    rows.push({
      id,
      platform: r.platform,
      url: typeof r.url === "string" ? r.url : "",
    });
  }
  return rows;
}

function seedFooterSocialLinksFromLegacyQuartet(
  socialFacebook: string,
  socialTwitter: string,
  socialInstagram: string,
  socialYoutube: string,
): FooterSocialLinkRow[] {
  const out: FooterSocialLinkRow[] = [];
  const push = (platform: FooterSocialPlatform, url: string) => {
    const u = url.trim();
    if (!u) return;
    out.push({ id: `legacy-${platform}`, platform, url: u });
  };
  push("facebook", socialFacebook);
  push("twitter", socialTwitter);
  push("instagram", socialInstagram);
  push("youtube", socialYoutube);
  return out;
}

function mirrorLegacyQuartetFromSocialLinks(links: FooterSocialLinkRow[]): {
  socialFacebook: string;
  socialTwitter: string;
  socialInstagram: string;
  socialYoutube: string;
} {
  const firstUrl = (p: FooterSocialPlatform) => links.find((l) => l.platform === p)?.url.trim() ?? "";
  return {
    socialFacebook: firstUrl("facebook"),
    socialTwitter: firstUrl("twitter"),
    socialInstagram: firstUrl("instagram"),
    socialYoutube: firstUrl("youtube"),
  };
}

export function normalizeFooterCustomizerState(raw: unknown): FooterCustomizerState {
  const empty: FooterCustomizerState = {
    mainBackgroundRgb: "",
    logoImageUrl: "",
    columnATitle: "",
    columnALinks: [],
    columnBTitle: "",
    columnBLinks: [],
    phoneDisplay: "",
    phoneHref: "",
    emailDisplay: "",
    emailHref: "",
    newsletterHeading: "",
    newsletterPlaceholder: "",
    socialLinks: [],
    socialFacebook: "",
    socialTwitter: "",
    socialInstagram: "",
    socialYoutube: "",
    copyrightHtml: "",
    subFooterBackgroundRgb: "",
    hideLocalization: false,
    hidePaymentIcons: false,
  };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;
  const o = raw as Record<string, unknown>;

  const parseLinks = (arr: unknown): FooterLinkRow[] => {
    if (!Array.isArray(arr)) return [];
    const rows: FooterLinkRow[] = [];
    for (const row of arr) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const r = row as Record<string, unknown>;
      const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : "";
      if (!id) continue;
      rows.push({
        id,
        label: typeof r.label === "string" ? r.label : "",
        href: typeof r.href === "string" ? r.href : "",
      });
    }
    return rows;
  };

  const legacyFacebook = typeof o.socialFacebook === "string" ? o.socialFacebook : "";
  const legacyTwitter = typeof o.socialTwitter === "string" ? o.socialTwitter : "";
  const legacyInstagram = typeof o.socialInstagram === "string" ? o.socialInstagram : "";
  const legacyYoutube = typeof o.socialYoutube === "string" ? o.socialYoutube : "";

  const socialLinksKeyPresent = "socialLinks" in o;
  const parsedSocialLinks = parseFooterSocialLinks(o.socialLinks);

  let socialLinks: FooterSocialLinkRow[];
  if (parsedSocialLinks.length > 0) {
    socialLinks = parsedSocialLinks;
  } else if (!socialLinksKeyPresent) {
    socialLinks = seedFooterSocialLinksFromLegacyQuartet(
      legacyFacebook,
      legacyTwitter,
      legacyInstagram,
      legacyYoutube,
    );
  } else {
    socialLinks = [];
  }

  const quartet =
    socialLinks.length > 0
      ? mirrorLegacyQuartetFromSocialLinks(socialLinks)
      : { socialFacebook: "", socialTwitter: "", socialInstagram: "", socialYoutube: "" };

  return {
    mainBackgroundRgb: typeof o.mainBackgroundRgb === "string" ? o.mainBackgroundRgb : "",
    logoImageUrl: typeof o.logoImageUrl === "string" ? o.logoImageUrl : "",
    columnATitle: typeof o.columnATitle === "string" ? o.columnATitle : "",
    columnALinks: parseLinks(o.columnALinks),
    columnBTitle: typeof o.columnBTitle === "string" ? o.columnBTitle : "",
    columnBLinks: parseLinks(o.columnBLinks),
    phoneDisplay: typeof o.phoneDisplay === "string" ? o.phoneDisplay : "",
    phoneHref: typeof o.phoneHref === "string" ? o.phoneHref : "",
    emailDisplay: typeof o.emailDisplay === "string" ? o.emailDisplay : "",
    emailHref: typeof o.emailHref === "string" ? o.emailHref : "",
    newsletterHeading: typeof o.newsletterHeading === "string" ? o.newsletterHeading : "",
    newsletterPlaceholder: typeof o.newsletterPlaceholder === "string" ? o.newsletterPlaceholder : "",
    socialLinks,
    socialFacebook: quartet.socialFacebook,
    socialTwitter: quartet.socialTwitter,
    socialInstagram: quartet.socialInstagram,
    socialYoutube: quartet.socialYoutube,
    copyrightHtml: typeof o.copyrightHtml === "string" ? o.copyrightHtml : "",
    subFooterBackgroundRgb: typeof o.subFooterBackgroundRgb === "string" ? o.subFooterBackgroundRgb : "",
    hideLocalization: o.hideLocalization === true,
    hidePaymentIcons: o.hidePaymentIcons === true,
  };
}

const IG_PATH =
  "M12 2.98C14.94 2.98 15.28 2.99 16.44 3.04C17.14 3.04 17.83 3.18 18.48 3.42C18.96 3.6 19.39 3.88 19.75 4.24C20.12 4.59 20.4 5.03 20.57 5.51C20.81 6.16 20.94 6.85 20.95 7.55C21 8.71 21.01 9.06 21.01 12C21.01 14.94 21 15.28 20.95 16.44C20.95 17.14 20.81 17.83 20.57 18.48C20.39 18.95 20.11 19.39 19.75 19.75C19.39 20.11 18.96 20.39 18.48 20.57C17.83 20.81 17.14 20.94 16.44 20.95C15.28 21 14.93 21.01 12 21.01C9.07 21.01 8.72 21 7.55 20.95C6.85 20.95 6.16 20.81 5.51 20.57C5.03 20.39 4.6 20.11 4.24 19.75C3.87 19.4 3.59 18.96 3.42 18.48C3.18 17.83 3.05 17.14 3.04 16.44C2.99 15.28 2.98 14.93 2.98 12C2.98 9.07 2.99 8.72 3.04 7.55C3.04 6.85 3.18 6.16 3.42 5.51C3.6 5.03 3.88 4.6 4.24 4.24C4.59 3.87 5.03 3.59 5.51 3.42C6.16 3.18 6.85 3.05 7.55 3.04C8.71 2.99 9.06 2.98 12 2.98ZM12 1C9.01 1 8.64 1.01 7.47 1.07C6.56 1.09 5.65 1.26 4.8 1.58C4.07 1.86 3.4 2.3 2.85 2.85C2.3 3.41 1.86 4.07 1.58 4.8C1.26 5.65 1.09 6.56 1.07 7.47C1.02 8.64 1 9.01 1 12C1 14.99 1.01 15.36 1.07 16.53C1.09 17.44 1.26 18.35 1.58 19.2C1.86 19.93 2.3 20.6 2.85 21.15C3.41 21.7 4.07 22.14 4.8 22.42C5.65 22.74 6.56 22.91 7.47 22.93C8.64 22.98 9.01 23 12 23C14.99 23 15.36 22.99 16.53 22.93C17.44 22.91 18.35 22.74 19.2 22.42C19.93 22.14 20.6 21.7 21.15 21.15C21.7 20.59 22.14 19.93 22.42 19.2C22.74 18.35 22.91 17.44 22.93 16.53C22.98 15.36 23 14.99 23 12C23 9.01 22.99 8.64 22.93 7.47C22.91 6.56 22.74 5.65 22.42 4.8C22.14 4.07 21.7 3.4 21.15 2.85C20.59 2.3 19.93 1.86 19.2 1.58C18.35 1.26 17.44 1.09 16.53 1.07C15.36 1.02 14.99 1 12 1ZM12 6.35C10.88 6.35 9.79 6.68 8.86 7.3C7.93 7.92 7.21 8.8 6.78 9.84C6.35 10.87 6.24 12.01 6.46 13.1C6.68 14.2 7.22 15.2 8.01 15.99C8.8 16.78 9.81 17.32 10.9 17.54C12 17.76 13.13 17.65 14.16 17.22C15.19 16.79 16.07 16.07 16.7 15.14C17.32 14.21 17.65 13.12 17.65 12C17.65 10.5 17.05 9.06 16 8.01C14.94 6.95 13.5 6.36 12.01 6.36L12 6.35ZM12 15.67C11.27 15.67 10.57 15.45 9.96 15.05C9.36 14.65 8.89 14.07 8.61 13.4C8.33 12.73 8.26 11.99 8.4 11.28C8.54 10.57 8.89 9.92 9.4 9.4C9.91 8.88 10.57 8.54 11.28 8.4C11.99 8.26 12.73 8.33 13.4 8.61C14.07 8.89 14.64 9.36 15.05 9.96C15.45 10.56 15.67 11.27 15.67 12C15.67 12.97 15.28 13.91 14.6 14.59C13.91 15.28 12.98 15.66 12.01 15.66L12 15.67ZM17.87 7.45C18.6 7.45 19.19 6.86 19.19 6.13C19.19 5.4 18.6 4.81 17.87 4.81C17.14 4.81 16.55 5.4 16.55 6.13C16.55 6.86 17.14 7.45 17.87 7.45Z";

const PIN_PATH =
  "M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.219-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.627 0 12-5.373 12-12S18.627 0 12 0z";

const TIKTOK_PATH =
  "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.245V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z";

const LINKEDIN_PATH =
  "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z";

function footerSocialSvgInner(platform: FooterSocialPlatform): { iconClass: string; label: string; path: string } {
  switch (platform) {
    case "facebook":
      return {
        iconClass: "icon-facebook",
        label: "Facebook",
        path: `<path d="M9.03153 23L9 13H5V9H9V6.5C9 2.7886 11.2983 1 14.6091 1C16.1951 1 17.5581 1.11807 17.9553 1.17085V5.04948L15.6591 5.05052C13.8584 5.05052 13.5098 5.90614 13.5098 7.16171V9H18.75L16.75 13H13.5098V23H9.03153Z"></path>`,
      };
    case "twitter":
      return {
        iconClass: "icon-twitter",
        label: "X (Twitter)",
        path: `<path d="M13.8984 10.4679L21.3339 2H19.5687L13.1074 9.35221L7.95337 2H2L9.80183 13.1157L2 22H3.7652L10.5845 14.2315L16.03 22H21.9833M4.398 3.29892H7.10408L19.5687 20.7594H16.8626"></path>`,
      };
    case "instagram":
      return {
        iconClass: "icon-instagram",
        label: "Instagram",
        path: `<path d="${IG_PATH}"></path>`,
      };
    case "youtube":
      return {
        iconClass: "icon-youtube",
        label: "YouTube",
        path: `<path d="M23.8 7.6C23.8 7.6 23.6 5.9 22.8 5.2C21.9 4.2 20.9 4.2 20.4 4.2C17 4 12 4 12 4C12 4 7 4 3.6 4.2C3.1 4.3 2.1 4.3 1.2 5.2C0.5 5.9 0.2 7.6 0.2 7.6C0.2 7.6 0 9.5 0 11.5V13.3C0 15.2 0.2 17.2 0.2 17.2C0.2 17.2 0.4 18.9 1.2 19.6C2.1 20.6 3.3 20.5 3.8 20.6C5.7 20.8 12 20.8 12 20.8C12 20.8 17 20.8 20.4 20.5C20.9 20.4 21.9 20.4 22.8 19.5C23.5 18.8 23.8 17.1 23.8 17.1C23.8 17.1 24 15.2 24 13.2V11.4C24 9.5 23.8 7.6 23.8 7.6ZM9.5 15.5V8.8L16 12.2L9.5 15.5Z"></path>`,
      };
    case "pinterest":
      return {
        iconClass: "icon-pinterest",
        label: "Pinterest",
        path: `<path d="${PIN_PATH}"></path>`,
      };
    case "tiktok":
      return {
        iconClass: "icon-tiktok",
        label: "TikTok",
        path: `<path d="${TIKTOK_PATH}"></path>`,
      };
    case "linkedin":
      return {
        iconClass: "icon-linkedin",
        label: "LinkedIn",
        path: `<path d="${LINKEDIN_PATH}"></path>`,
      };
  }
}

function renderSocialLiFromRow(row: FooterSocialLinkRow): string {
  const href = row.url.trim() || "#";
  const svg = footerSocialSvgInner(row.platform);
  return `<li><a target="_blank" rel="noopener noreferrer" href="${escapeAttr(href)}" class="social_platform block relative" is="magnet-link" aria-describedby="a11y-new-window-message" aria-label="${escapeAttr(svg.label)}"><svg class="icon ${svg.iconClass} icon-lg" viewBox="0 0 24 24" stroke="none" fill="currentColor" xmlns="http://www.w3.org/2000/svg" role="presentation">
      ${svg.path}
    </svg><span class="sr-only">${escapeHtml(svg.label)}</span>
        </a>
      </li>`;
}

/** Legacy quartet: always four slots (matches original theme behavior when not using `socialLinks`). */
function renderLegacySocialItems(state: FooterCustomizerState): string {
  const rows: FooterSocialLinkRow[] = [
    { id: "q-fb", platform: "facebook", url: state.socialFacebook },
    { id: "q-tw", platform: "twitter", url: state.socialTwitter },
    { id: "q-ig", platform: "instagram", url: state.socialInstagram },
    { id: "q-yt", platform: "youtube", url: state.socialYoutube },
  ];
  return rows.map(renderSocialLiFromRow).join("");
}

function renderFooterSocialItems(state: FooterCustomizerState): string {
  const custom = state.socialLinks ?? [];
  if (custom.length > 0) return custom.map(renderSocialLiFromRow).join("");
  return renderLegacySocialItems(state);
}

/** True when main footer band (menus, newsletter, etc.) should be rebuilt from saved fields. */
export function hasMainFooterCustomization(state: FooterCustomizerState | undefined): boolean {
  if (!state) return false;
  const s = (x: string) => x.trim();
  if (s(state.mainBackgroundRgb) || s(state.logoImageUrl)) return true;
  if (s(state.columnATitle) || s(state.columnBTitle)) return true;
  for (const l of [...(state.columnALinks ?? []), ...(state.columnBLinks ?? [])]) {
    if (s(l.label) || s(l.href)) return true;
  }
  if (s(state.phoneDisplay) || s(state.emailDisplay) || s(state.phoneHref) || s(state.emailHref)) return true;
  if (s(state.newsletterHeading) || s(state.newsletterPlaceholder)) return true;
  for (const sl of state.socialLinks ?? []) {
    if (s(sl.url)) return true;
  }
  if (s(state.socialFacebook) || s(state.socialTwitter) || s(state.socialInstagram) || s(state.socialYoutube))
    return true;
  return false;
}

/** True when copyright bar fields or toggles should be patched. */
export function hasCopyrightFooterCustomization(state: FooterCustomizerState | undefined): boolean {
  if (!state) return false;
  if (state.hideLocalization || state.hidePaymentIcons) return true;
  if (state.copyrightHtml.trim() || state.subFooterBackgroundRgb.trim()) return true;
  return false;
}

export function isFooterCustomizerActive(state: FooterCustomizerState | undefined): boolean {
  return hasMainFooterCustomization(state) || hasCopyrightFooterCustomization(state);
}

export function discoverFooterFromHtml(html: string): FooterCustomizerState | null {
  const bounds = findSectionBounds(html, MAIN_FOOTER_OPEN_RE);
  if (!bounds) return null;
  const section = html.slice(bounds.start, bounds.end);

  const bgM = section.match(/--color-background:\s*([^;]+);/i);
  const mainBackgroundRgb = bgM?.[1]?.trim() ?? "";

  const logoM = section.match(/<div\b[^>]*class="[^"]*footer__logo[^"]*"[^>]*>[\s\S]*?<img[^>]*\bsrc="([^"]*)"/i);
  const logoImageUrl = logoM?.[1]?.trim() ?? "";

  const details = parseDetailBlocks(section);
  const columnATitle = details[0]?.title ?? "";
  const columnALinks = (details[0]?.links ?? []).map((l, i) => ({
    id: `scan-a-${i}`,
    label: l.label,
    href: l.href,
  }));
  const columnBTitle = details[1]?.title ?? "";
  const columnBLinks = (details[1]?.links ?? []).map((l, i) => ({
    id: `scan-b-${i}`,
    label: l.label,
    href: l.href,
  }));

  const phoneM = section.match(/href="([^"]*tel:[^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*btn-text[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  const emailM = section.match(/href="([^"]*mailto:[^"]*)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*btn-text[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  const phoneHref = phoneM?.[1]?.trim() ?? "";
  const phoneDisplay = phoneM?.[2] ? stripTags(phoneM[2]) : "";
  const emailHref = emailM?.[1]?.trim() ?? "";
  const emailDisplay = emailM?.[2] ? stripTags(emailM[2]) : "";

  const newsPM = section.match(
    /<div\b[^>]*class="[^"]*footer__newsletter[^"]*"[^>]*>[\s\S]*?<p\b[^>]*class="[^"]*h3[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
  );
  const newsletterHeading = newsPM?.[1] ? stripTags(newsPM[1]) : "";

  const phM = section.match(/<input[^>]*\bplaceholder="([^"]*)"[^>]*>/i);
  const newsletterPlaceholder = phM?.[1]?.trim() ?? "";

  const tail = section.match(/<div\b[^>]*class="[^"]*footer__socials[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<parallax-overlay/i);
  const socialBlock = tail?.[1] ?? section;
  const socialFacebook = discoverSocialHref(socialBlock, "icon-facebook");
  const socialTwitter = discoverSocialHref(socialBlock, "icon-twitter");
  const socialInstagram = discoverSocialHref(socialBlock, "icon-instagram");
  const socialYoutube = discoverSocialHref(socialBlock, "icon-youtube");
  const socialPinterest = discoverSocialHref(socialBlock, "icon-pinterest");
  const socialTiktok = discoverSocialHref(socialBlock, "icon-tiktok");
  const socialLinkedin = discoverSocialHref(socialBlock, "icon-linkedin");

  const discoveredSocialLinks: FooterSocialLinkRow[] = (() => {
    const rows: FooterSocialLinkRow[] = [];
    let i = 0;
    const add = (platform: FooterSocialPlatform, url: string) => {
      const u = url.trim();
      if (!u) return;
      rows.push({ id: `scan-soc-${i++}`, platform, url: u });
    };
    add("facebook", socialFacebook);
    add("twitter", socialTwitter);
    add("instagram", socialInstagram);
    add("youtube", socialYoutube);
    add("pinterest", socialPinterest);
    add("tiktok", socialTiktok);
    add("linkedin", socialLinkedin);
    return rows;
  })();

  let copyrightHtml = "";
  let subFooterBackgroundRgb = "";
  const cb = findSectionBounds(html, COPYRIGHT_FOOTER_OPEN_RE);
  if (cb) {
    const csec = html.slice(cb.start, cb.end);
    const subBg = csec.match(/--color-background:\s*([^;]+);/i);
    subFooterBackgroundRgb = subBg?.[1]?.trim() ?? "";
    const credM = csec.match(/<div\b[^>]*class="[^"]*\brte\b[^"]*\bcredits\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div\b[^>]*class="[^"]*localization\b/i);
    if (credM?.[1]) {
      copyrightHtml = credM[1].trim();
    }
  }

  return normalizeFooterCustomizerState({
    mainBackgroundRgb,
    logoImageUrl,
    columnATitle,
    columnALinks,
    columnBTitle,
    columnBLinks,
    phoneDisplay,
    phoneHref,
    emailDisplay,
    emailHref,
    newsletterHeading,
    newsletterPlaceholder,
    ...(discoveredSocialLinks.length ? { socialLinks: discoveredSocialLinks } : {}),
    socialFacebook,
    socialTwitter,
    socialInstagram,
    socialYoutube,
    copyrightHtml,
    subFooterBackgroundRgb,
    hideLocalization: false,
    hidePaymentIcons: false,
  });
}

const CHEVRON_UP = `<svg class="icon icon-chevron-up icon-md" viewBox="0 0 24 24" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 15L12 9L18 15"></path>
    </svg>`;

function renderLinkUl(links: FooterLinkRow[]): string {
  const items = links
    .filter((l) => l.label.trim() || l.href.trim())
    .map(
      (l) => `<li class="inline-flex">
            <a href="${escapeAttr(l.href.trim() || "#")}" class="block reversed-link text-sm-lg leading-tight">${escapeHtml(l.label.trim() || l.href.trim() || "Link")}</a>
          </li>`,
    )
    .join("");
  return `<ul class="flex flex-col gap-3">${items}</ul>`;
}

function renderDetailsColumn(classSuffix: string, title: string, linksHtml: string): string {
  return `<details class="footer__item--${classSuffix} details active" is="footer-details" aria-expanded="true" open="" style="overflow: visible; height: auto;">
      <summary class="details__summary flex items-center justify-between gap-2 cursor-pointer">
        <span class="heading text-base-2xl font-medium lg:font-heading">${escapeHtml(title)}</span>${CHEVRON_UP}</summary><div class="details__content" style="opacity: 1; transform: translateY(0px);">
      ${linksHtml}
    </div>
    <style>
      @media (min-width: 1280px) {
        .footer__item--${classSuffix} { width: calc(50% - var(--sp-12)); }
      }
    </style></details>`;
}

function buildMainFooterInner(sectionHtml: string, state: FooterCustomizerState): string {
  const openM = sectionHtml.match(/^<div\b[^>]*>/i);
  const openTag = openM?.[0] ?? "<div>";
  const styleM = sectionHtml.match(/<style>[\s\S]*?<\/style>/i);
  let styleBlock = styleM?.[0] ?? "";
  if (state.mainBackgroundRgb.trim() && styleBlock) {
    const rgb = state.mainBackgroundRgb.trim();
    if (/--color-background:\s*[^;]+;/i.test(styleBlock)) {
      styleBlock = styleBlock.replace(/--color-background:\s*[^;]+;/i, `--color-background: ${rgb};`);
    }
  }

  const colA = state.columnATitle.trim() ? state.columnATitle : "Menu";
  const colB = state.columnBTitle.trim() ? state.columnBTitle : "Menu";
  const linksA = renderLinkUl((state.columnALinks ?? []).filter((l) => l.label.trim() || l.href.trim()));
  const linksB = renderLinkUl((state.columnBLinks ?? []).filter((l) => l.label.trim() || l.href.trim()));

  const phoneDisp = state.phoneDisplay.trim();
  const phoneH = state.phoneHref.trim() || (phoneDisp ? `tel:${phoneDisp.replace(/\s+/g, "")}` : "#");
  const emailDisp = state.emailDisplay.trim();
  const emailH = state.emailHref.trim() || (emailDisp ? `mailto:${emailDisp}` : "#");

  const contactBlock =
    phoneDisp || emailDisp
      ? `<div class="footer__item--pfd-contact no-details"><div class="details__content">
      <div class="footer__contact flex flex-col gap-1">${
        phoneDisp
          ? `<p>
            <a class="link inline-block leading-tight text-left" href="${escapeAttr(phoneH)}" is="magnet-link">
              <span class="btn-text" data-text="">${escapeHtml(phoneDisp)}</span>
            </a>
          </p>`
          : ""
      }${
        emailDisp
          ? `<p>
            <a class="link inline-block leading-tight text-left" href="${escapeAttr(emailH)}" is="magnet-link">
              <span class="btn-text" data-text="">${escapeHtml(emailDisp)}</span>
            </a>
          </p>`
          : ""
      }</div>
    </div>
    <style>
      @media (min-width: 1280px) {
        .footer__item--pfd-contact { width: calc(95% - var(--sp-12)); }
      }
    </style></div>`
      : "";

  const newsletterHead = state.newsletterHeading.trim()
    ? state.newsletterHeading.trim()
    : "Newsletter";
  const newsPh = state.newsletterPlaceholder.trim() || "Email";

  const logoSrcM = sectionHtml.match(/<img[^>]*\bsrc="([^"]*)"/);
  const logoSrc = state.logoImageUrl.trim() || logoSrcM?.[1] || "";
  const srM = sectionHtml.match(/<span class="sr-only">([^<]*)<\/span>\s*<img/i);
  const srOnly = srM?.[1]?.trim() || "Store";

  const accordionInner = `${renderDetailsColumn("pfd-col-a", colA, linksA)}${renderDetailsColumn("pfd-col-b", colB, linksB)}${contactBlock}`;

  const socialItems = renderFooterSocialItems(state);

  const innerBody = `<div class="section section--padding section--rounded section--next-rounded" is="footer-parallax" style="z-index: 2;">
  <div class="footer page-width relative grid" role="region" aria-label="Footer"><div class="footer__left flex flex-col md:flex-row gap-10"><div class="footer__logo flex flex-col gap-10"><p class="leading-none">
        <a href="/shop">
          <span class="sr-only">${escapeHtml(srOnly)}</span>${
            logoSrc
              ? `<img src="${escapeAttr(logoSrc)}" alt="" width="320" height="120" loading="eager" sizes="160px" style="--image-width: 160px; --image-height: 60px; max-width: 160px; max-height: 60px; width: auto; height: auto; object-fit: contain;" is="lazy-image">`
              : ""
          }</a>
      </p></div><div class="footer__accordions flex flex-wrap flex-col md:flex-row md:grow md:gap-12">${accordionInner}</div>
      </div><div class="footer__right grid gap-10"><div class="footer__newsletter grid gap-6"><p class="h3 text-xl md:title-lg leading-none tracking-none font-medium lg:font-heading">${escapeHtml(newsletterHead)}</p><form method="post" action="#" id="newsletter-pfd-footer" accept-charset="UTF-8" class="newsletter-form grid gap-5"><input type="hidden" name="form_type" value="customer"><input type="hidden" name="utf8" value="✓"><input type="hidden" name="contact[tags]" value="newsletter">
  <input type="hidden" name="contact[context]" value="footer">
  <div class="field relative">
    <input id="NewsletterForm-pfd-footer" class="input is-floating input--fill" type="email" name="contact[email]" value="" autocorrect="off" autocapitalize="off" autocomplete="email" placeholder="${escapeAttr(newsPh)}" required="">
    <label class="label is-floating" for="NewsletterForm-pfd-footer">${escapeHtml(newsPh)}</label>
    <div class="self-submit-button absolute">
      <button type="submit" class="button button--primary self-button flex justify-center items-center" is="magnet-button" data-magnet="20" aria-label="Subscribe">
        <span class="btn-text">
          <svg class="icon icon-arrow-right icon-xs transform" viewBox="0 0 16 16" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2 8.00012H14M14 8.00012L9.33333 3.3335M14 8.00012L9.33333 12.6668"></path>
          </svg>
        </span>
      <span class="btn-loader">
        <span></span>
        <span></span>
        <span></span>
      </span></button>
    </div>
  </div></form></div><div class="footer__socials flex align-self-end justify-start md:justify-end xl:justify-start"><ul class="flex flex-wrap items-center gap-7" role="list">${socialItems}</ul></div></div></div><parallax-overlay class="footer-overlay hidden md:block z-20 absolute left-0 top-0 w-full pointer-events-none" data-target="height" data-start="100%" data-stop="0%"></parallax-overlay></div>`;

  return `${openTag}${styleBlock}${innerBody}</div>`;
}

function patchCopyrightSection(sectionHtml: string, state: FooterCustomizerState): string {
  let out = sectionHtml;
  if (state.subFooterBackgroundRgb.trim()) {
    const rgb = state.subFooterBackgroundRgb.trim();
    if (/--color-background:\s*[^;]+;/i.test(out)) {
      out = out.replace(/--color-background:\s*[^;]+;/i, `--color-background: ${rgb};`);
    }
  }
  if (state.copyrightHtml.trim()) {
    out = out.replace(
      /(<div\b[^>]*\bclass="[^"]*\brte\b[^"]*\bcredits\b[^"]*"[^>]*>)([\s\S]*?)(<\/div>\s*<div\b[^>]*\bclass="[^"]*localization\b)/i,
      `$1${state.copyrightHtml.trim()}$3`,
    );
  }
  if (state.hideLocalization) {
    out = out.replace(
      /(<div\b[^>]*\bclass=")([^"]*\blocalization\b[^"]*)(")/i,
      `$1$2 hidden$3`,
    );
  }
  if (state.hidePaymentIcons) {
    out = out.replace(
      /(<ul\b[^>]*\bclass=")([^"]*\bpayment-icons\b[^"]*)(")/i,
      `$1$2 hidden$3`,
    );
  }
  return out;
}

/**
 * Applies footer customizations to full page HTML (Concept `index.html` export).
 */
export function applyFooterCustomizerToHtml(html: string, state: FooterCustomizerState | undefined): string {
  if (!state || !isFooterCustomizerActive(state)) return html;
  let out = html;

  if (hasMainFooterCustomization(state)) {
    const mainBounds = findSectionBounds(out, MAIN_FOOTER_OPEN_RE);
    if (mainBounds) {
      const sectionSlice = out.slice(mainBounds.start, mainBounds.end);
      const rebuilt = buildMainFooterInner(sectionSlice, state);
      out = out.slice(0, mainBounds.start) + rebuilt + out.slice(mainBounds.end);
    }
  }

  if (hasCopyrightFooterCustomization(state)) {
    const copyBounds = findSectionBounds(out, COPYRIGHT_FOOTER_OPEN_RE);
    if (copyBounds) {
      const cSlice = out.slice(copyBounds.start, copyBounds.end);
      const patched = patchCopyrightSection(cSlice, state);
      out = out.slice(0, copyBounds.start) + patched + out.slice(copyBounds.end);
    }
  }

  return out;
}
