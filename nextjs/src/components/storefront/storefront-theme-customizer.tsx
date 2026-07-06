"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { STOREFRONT_CUSTOMIZER_LIVE_PREVIEW_MESSAGE_TYPE } from "@/components/storefront/public/storefront-customizer-intro-preview-bridge";
import {
  STOREFRONT_CUSTOMIZER_FRAME_HEIGHT_MESSAGE_TYPE,
} from "@/components/storefront/public/storefront-customizer-preview-frame-bridge";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Columns2,
  ChevronRight,
  ExternalLink,
  Fingerprint,
  ImageIcon,
  Loader2,
  Megaphone,
  Package,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Save,
  ScrollText,
  Share2,
  ShieldCheck,
  Star,
  Smartphone,
  Tablet,
  LayoutGrid,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { appConfirm } from "@/lib/app-confirm";
import { REVERSE_PROXY_413_UPLOAD_MESSAGE } from "@/lib/safe-fetch-json";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  normalizeThemeCustomizerContentState,
  type BeforeAfterSectionState,
  type BundleSectionState,
  type FooterCustomizerState,
  type MarqueeTextCustomizerState,
  type HeroSliderSlideRow,
  type IntroSectionState,
  type SocialLinksCustomizerState,
  type ThemeCustomizerContentState,
  type ThemeCustomizerImageRow,
  type ThemeCustomizerTextRow,
  type TopHeaderCustomizerState,
  type TrustIconsSectionState,
} from "@/lib/storefront/theme-customizer-content";
import { hexToRgbTriplet, rgbTripletToHex } from "@/lib/storefront/footer-background-color";
import {
  FOOTER_SOCIAL_PLATFORM_OPTIONS,
  isFooterCustomizerActive,
  normalizeFooterCustomizerState,
  type FooterLinkRow,
  type FooterSocialLinkRow,
  type FooterSocialPlatform,
} from "@/lib/storefront/theme-customizer-footer";
import { normalizeFeaturedProductsCustomizerState } from "@/lib/storefront/theme-customizer-featured-products";
import { normalizeBeforeAfterSectionState } from "@/lib/storefront/theme-customizer-before-after";
import { normalizeMarqueeTextState } from "@/lib/storefront/theme-customizer-marquee-text";
import { normalizeBundleSectionState } from "@/lib/storefront/theme-customizer-bundle-section";
import { normalizeTopHeaderState } from "@/lib/storefront/theme-customizer-top-header";
import { normalizeSocialLinksState } from "@/lib/storefront/theme-customizer-social-links";
import {
  TRUST_ICONS_ICON_OPTIONS,
  normalizeTrustIconsSectionState,
  type TrustIconsColumn,
} from "@/lib/storefront/theme-customizer-trust-icons";
import {
  STOREFRONT_MERCHANT_SETTINGS_DEFAULTS,
  STOREFRONT_SITE_IDENTITY_KEYS,
  type StorefrontSiteIdentityKey,
} from "@/lib/storefront/storefront-settings-keys";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";
import {
  STOREFRONT_EDITOR_IMAGE_MAX_BYTES,
  storefrontEditorImageTooLargeMessage,
} from "@/lib/storefront/storefront-image-upload-limit";

const ORG_STORAGE_KEY = "pf_sf_merchant_org_id";

/**
 * Resolve hero slide `imageUrl` for the sidebar preview.
 * Theme exports use `./assets/…`; live shop serves those via `/shop/theme-assets/{themeVersionId}/assets/…`.
 */
function heroSlideImagePreviewUrl(imageUrl: string, themeVersionId: string): string {
  const raw = imageUrl.trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) return raw;
  if (typeof window === "undefined") return raw;
  const origin = window.location.origin;
  if (raw.startsWith("/shop/theme-assets/")) return `${origin}${raw}`;
  if (raw.startsWith("/")) return `${origin}${raw}`;
  const pathPart = raw.replace(/^\.\//, "").replace(/^\/+/, "");
  if (pathPart && themeVersionId.trim()) {
    return `${origin}/shop/theme-assets/${themeVersionId.trim()}/${pathPart}`;
  }
  return `${origin}/${pathPart}`;
}

/** Merge index.html discovery into saved slides so empty fields show current theme defaults (incl. images). */
function mergeHeroSlidesFromDiscovery(
  existing: HeroSliderSlideRow[],
  discovered: HeroSliderSlideRow[],
  genId: () => string,
): HeroSliderSlideRow[] {
  if (!discovered.length) return existing;
  if (!existing.length) return discovered;
  const byIdx = new Map<number, HeroSliderSlideRow>();
  for (const s of existing) byIdx.set(s.sortIndex, s);
  for (const d of discovered) {
    const cur = byIdx.get(d.sortIndex);
    if (!cur) {
      byIdx.set(d.sortIndex, { ...d, id: genId() });
    } else {
      byIdx.set(d.sortIndex, {
        ...cur,
        imageUrl: cur.imageUrl.trim() ? cur.imageUrl : d.imageUrl,
        heading: cur.heading.trim() ? cur.heading : d.heading,
        buttonText: cur.buttonText.trim() ? cur.buttonText : d.buttonText,
        buttonHref: cur.buttonHref.trim() ? cur.buttonHref : d.buttonHref,
      });
    }
  }
  return [...byIdx.entries()].sort((a, b) => a[0] - b[0]).map(([, s]) => s);
}

type OrgContext = {
  isSuperadmin: boolean;
  organizations: { id: string; name: string }[];
  defaultOrganizationId: string | null;
};

type StyleToken = { tokenKey: string; value: string; groupName?: string | null };

type SiteIdentityState = Record<StorefrontSiteIdentityKey, string>;

function emptySiteIdentity(): SiteIdentityState {
  const o = {} as SiteIdentityState;
  for (const k of STOREFRONT_SITE_IDENTITY_KEYS) {
    o[k] = STOREFRONT_MERCHANT_SETTINGS_DEFAULTS[k];
  }
  return o;
}

function mergeSiteIdentityFromApi(raw: unknown): SiteIdentityState {
  const base = emptySiteIdentity();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const r = raw as Record<string, unknown>;
  for (const k of STOREFRONT_SITE_IDENTITY_KEYS) {
    if (typeof r[k] === "string") base[k] = r[k];
  }
  return base;
}

function errorForUploadProxyHtml(res: Response, bodySample: string): string {
  const is413 =
    res.status === 413 ||
    /413\s+Request Entity Too Large/i.test(bodySample) ||
    /request entity too large/i.test(bodySample);
  if (is413) return REVERSE_PROXY_413_UPLOAD_MESSAGE;
  return `Server returned HTML instead of JSON (${res.status}). Often a proxy 404/502 or auth redirect — check /api routes and deploy logs.`;
}

async function readJsonResponse<T>(res: Response): Promise<T> {
  if (res.status === 413) {
    throw new Error(REVERSE_PROXY_413_UPLOAD_MESSAGE);
  }
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) throw new Error(`Empty server response (${res.status}).`);
  if (trimmed.startsWith("<")) {
    throw new Error(errorForUploadProxyHtml(res, trimmed));
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`Invalid JSON (${res.status}): ${trimmed.slice(0, 160)}`);
  }
}

export function StorefrontThemeCustomizer({
  initialThemeId,
  initialWebsiteId,
  initialOrganizationId,
}: {
  initialThemeId?: string;
  initialWebsiteId?: string;
  initialOrganizationId?: string;
}) {
  const [orgCtx, setOrgCtx] = useState<OrgContext | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);

  const [themeId, setThemeId] = useState(initialThemeId?.trim() ?? "");
  const [themeVersionId, setThemeVersionId] = useState("");
  const [themeName, setThemeName] = useState("");
  const [websiteId, setWebsiteId] = useState(initialWebsiteId?.trim() ?? "");
  const [tokens, setTokens] = useState<StyleToken[]>([]);
  const [baselineJson, setBaselineJson] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewOrigin, setPreviewOrigin] = useState<string | null>(null);
  const emptyIntroSection = (): IntroSectionState => ({
    heading: "",
    headingHighlightWord: "",
    buttonText: "",
    buttonHref: "",
    bodyHtml: "",
  });

  const emptyBeforeAfterSection = (): BeforeAfterSectionState =>
    normalizeBeforeAfterSectionState(undefined);

  const emptyMarqueeText = (): MarqueeTextCustomizerState => normalizeMarqueeTextState(undefined);

  const emptyFooterSection = (): FooterCustomizerState => normalizeFooterCustomizerState(undefined);

  const emptyTrustIconsSection = (): TrustIconsSectionState => normalizeTrustIconsSectionState(undefined);

  const emptyBundleSection = (): BundleSectionState => normalizeBundleSectionState(undefined);

  const emptyTopHeader = (): TopHeaderCustomizerState => normalizeTopHeaderState(undefined);

  const emptySocialLinks = (): SocialLinksCustomizerState => normalizeSocialLinksState(undefined);

  const [contentState, setContentState] = useState<ThemeCustomizerContentState>({
    images: [],
    texts: [],
    heroSlider: { slides: [] },
    introSection: emptyIntroSection(),
    featuredProducts: normalizeFeaturedProductsCustomizerState(undefined),
    beforeAfterSection: emptyBeforeAfterSection(),
    marqueeText: emptyMarqueeText(),
    trustIconsSection: emptyTrustIconsSection(),
    footerSection: emptyFooterSection(),
    bundleSection: emptyBundleSection(),
    topHeader: emptyTopHeader(),
    socialLinks: emptySocialLinks(),
  });
  const [baselineContentJson, setBaselineContentJson] = useState("");
  const [siteIdentity, setSiteIdentity] = useState<SiteIdentityState>(() => emptySiteIdentity());
  const [baselineSiteIdentityJson, setBaselineSiteIdentityJson] = useState(() => JSON.stringify(emptySiteIdentity()));
  const [scanningContent, setScanningContent] = useState(false);
  const [heroSlideUploading, setHeroSlideUploading] = useState<Record<string, boolean>>({});
  const [seeding, setSeeding] = useState(false);
  const attemptedSeedVersionRef = useRef<string | null>(null);
  const heroSlideFileInputRef = useRef<HTMLInputElement>(null);
  const heroSlidePendingUploadIdRef = useRef<string | null>(null);
  const comparisonFileInputRef = useRef<HTMLInputElement>(null);
  const comparisonPendingSideRef = useRef<"before" | "after" | null>(null);
  const siteIdentityLogoFileRef = useRef<HTMLInputElement>(null);
  const siteIdentityFaviconFileRef = useRef<HTMLInputElement>(null);
  const [comparisonUploading, setComparisonUploading] = useState<Record<string, boolean>>({});
  const [siteIdentityLogoUploading, setSiteIdentityLogoUploading] = useState(false);
  const [siteIdentityFaviconUploading, setSiteIdentityFaviconUploading] = useState(false);
  const [customizerPanel, setCustomizerPanel] = useState<
    | "menu"
    | "site-identity"
    | "top-header"
    | "social-links"
    | "homepage-media"
    | "homepage-intro"
    | "text-banners"
    | "featured-products"
    | "marquee-text"
    | "before-after"
    | "trust-icons"
    | "footer"
    | "bundle"
  >("menu");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const newId = () =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `pf-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const buildApiUrl = useCallback(
    (pathname: string, extraSearch?: Record<string, string | undefined>) => {
      const u = new URL(pathname, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      if (orgCtx?.isSuperadmin && selectedOrgId) {
        u.searchParams.set("organizationId", selectedOrgId);
      }
      if (extraSearch) {
        for (const [k, v] of Object.entries(extraSearch)) {
          if (v != null && v !== "") u.searchParams.set(k, v);
        }
      }
      return u.pathname + u.search;
    },
    [orgCtx?.isSuperadmin, selectedOrgId],
  );

  const orgReady = orgCtx != null && (!orgCtx.isSuperadmin || !!selectedOrgId);

  const tokensDirty = useMemo(() => JSON.stringify(tokens) !== baselineJson, [tokens, baselineJson]);
  const contentDirty = useMemo(
    () => JSON.stringify(contentState) !== baselineContentJson,
    [contentState, baselineContentJson],
  );
  const identityDirty = useMemo(
    () => JSON.stringify(siteIdentity) !== baselineSiteIdentityJson,
    [siteIdentity, baselineSiteIdentityJson],
  );
  const dirty = tokensDirty || contentDirty || identityDirty;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setOrgLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/storefront/organization-context", { credentials: "include" });
        const json = (await res.json()) as OrgContext & { ok?: boolean; message?: string };
        if (!res.ok || !json.ok) throw new Error(json.message ?? "Failed to load organization context");
        if (cancelled) return;
        const c: OrgContext = {
          isSuperadmin: json.isSuperadmin,
          organizations: json.organizations ?? [],
          defaultOrganizationId: json.defaultOrganizationId ?? null,
        };
        setOrgCtx(c);
        let orgId: string | null = null;
        if (initialOrganizationId && c.isSuperadmin && c.organizations.some((o) => o.id === initialOrganizationId)) {
          orgId = initialOrganizationId;
          try {
            window.localStorage.setItem(ORG_STORAGE_KEY, initialOrganizationId);
          } catch {
            /* ignore */
          }
        } else if (c.isSuperadmin) {
          const stored = typeof window !== "undefined" ? window.localStorage.getItem(ORG_STORAGE_KEY) : null;
          const ids = new Set(c.organizations.map((o) => o.id));
          if (stored && ids.has(stored)) orgId = stored;
          else orgId = c.defaultOrganizationId;
          if (orgId) {
            try {
              window.localStorage.setItem(ORG_STORAGE_KEY, orgId);
            } catch {
              /* ignore */
            }
          }
        } else {
          orgId = c.defaultOrganizationId;
        }
        setSelectedOrgId(orgId);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setOrgLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialOrganizationId]);

  const resolvePreviewOrigin = useCallback(async () => {
    const wid = websiteId.trim();
    if (!wid || !/^\d+$/.test(wid)) {
      setPreviewOrigin(null);
      return;
    }
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/domains?websiteId=${encodeURIComponent(wid)}`), {
        credentials: "same-origin",
      });
      const data = await readJsonResponse<{
        ok?: boolean;
        data?: Array<{ hostname: string; isPrimary: boolean }>;
      }>(res);
      if (!res.ok || !data.ok || !data.data?.length) {
        setPreviewOrigin(null);
        return;
      }
      const sorted = [...data.data].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
      const host = sorted[0]!.hostname.trim();
      const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(host) || host.endsWith(".local");
      const proto = isLocal ? "http:" : "https:";
      setPreviewOrigin(`${proto}//${host}`);
    } catch {
      setPreviewOrigin(null);
    }
  }, [buildApiUrl, websiteId]);

  useEffect(() => {
    if (!orgReady) return;
    void resolvePreviewOrigin();
  }, [orgReady, resolvePreviewOrigin]);

  const loadTheme = useCallback(async () => {
    const tid = themeId.trim();
    if (!tid) {
      setError(t("Missing theme id."));
      return;
    }
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/themes/${encodeURIComponent(tid)}`), {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await readJsonResponse<{
        ok?: boolean;
        message?: string;
        data?: {
          name?: string;
          websiteId?: string | bigint | null;
          versions?: Array<{ id: string; metadata?: unknown; styleTokens?: StyleToken[] }>;
          siteIdentity?: unknown;
        };
      }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed to load theme");
      const th = data.data;
      setThemeName(String(th?.name ?? ""));
      const wid = th?.websiteId != null ? String(th.websiteId) : "";
      if (wid) setWebsiteId((prev) => (prev.trim() ? prev : wid));
      const v = th?.versions?.[0];
      if (!v?.id) throw new Error("Theme has no published version to edit.");
      setThemeVersionId(v.id);
      const list = Array.isArray(v.styleTokens) ? v.styleTokens : [];
      setTokens(list);
      setBaselineJson(JSON.stringify(list));
      const vm =
        v?.metadata && typeof v.metadata === "object" && !Array.isArray(v.metadata)
          ? (v.metadata as Record<string, unknown>)
          : {};
      let merged = normalizeThemeCustomizerContentState(vm.customizerContent);
      try {
        const discRes = await fetch(
          buildApiUrl(`/api/storefront/themes/${encodeURIComponent(tid)}/discover-home-content`),
          { credentials: "same-origin", cache: "no-store" },
        );
        const discData = await readJsonResponse<{
          ok?: boolean;
          heroSliderSlides?: HeroSliderSlideRow[];
        }>(discRes);
        const discovered = Array.isArray(discData.heroSliderSlides) ? discData.heroSliderSlides : [];
        if (discRes.ok && discData.ok && discovered.length > 0) {
          const genSlideId = () =>
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : `pf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          merged = {
            ...merged,
            heroSlider: {
              slides: mergeHeroSlidesFromDiscovery(merged.heroSlider?.slides ?? [], discovered, genSlideId),
            },
          };
        }
      } catch {
        /* Theme extract missing or offline — keep metadata-only state */
      }
      setContentState(merged);
      setBaselineContentJson(JSON.stringify(merged));
      const mergedIdentity = mergeSiteIdentityFromApi(th?.siteIdentity);
      setSiteIdentity(mergedIdentity);
      setBaselineSiteIdentityJson(JSON.stringify(mergedIdentity));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, themeId]);

  useEffect(() => {
    attemptedSeedVersionRef.current = null;
  }, [themeId, selectedOrgId]);

  useEffect(() => {
    if (!orgReady || !themeId.trim()) return;
    void loadTheme();
  }, [orgReady, themeId, selectedOrgId, loadTheme]);

  const seedStyleTokensFromFiles = useCallback(
    async (manual: boolean) => {
      const tid = themeId.trim();
      const vid = themeVersionId.trim();
      if (!tid || !vid) return;
      if (manual) {
        const ok = await appConfirm(
          t("Replace all design tokens from the theme CSS files on disk? Unsaved changes in the editor will be lost."),
        );
        if (!ok) return;
      }
      setSeeding(true);
      setError(null);
      setStatus(null);
      try {
        const res = await fetch(buildApiUrl(`/api/storefront/themes/${encodeURIComponent(tid)}`), {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "seed_style_tokens", themeVersionId: vid }),
        });
        const data = await readJsonResponse<{ ok?: boolean; message?: string; seeded?: number }>(res);
        if (!res.ok || !data.ok) throw new Error(data.message ?? t("Could not load tokens from theme files."));
        const n = typeof data.seeded === "number" ? data.seeded : 0;
        if (n === 0) {
          setStatus(
            t(
              "No CSS variables found under :root in assets/styles/index-head.css (or fallbacks). Publish the theme or open the storefront once so files exist on this server.",
            ),
          );
        } else {
          setStatus(t(`Loaded ${n} design tokens from theme files.`));
        }
        await loadTheme();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setSeeding(false);
      }
    },
    [buildApiUrl, loadTheme, themeId, themeVersionId, t],
  );

  useEffect(() => {
    if (!orgReady || !themeVersionId || tokens.length > 0 || loading || seeding) return;
    if (attemptedSeedVersionRef.current === themeVersionId) return;
    attemptedSeedVersionRef.current = themeVersionId;
    void seedStyleTokensFromFiles(false);
  }, [orgReady, themeVersionId, tokens.length, loading, seeding, seedStyleTokensFromFiles]);

  const uploadSiteIdentityImage = useCallback(
    async (file: File, field: "sf_logo_url" | "sf_favicon_url") => {
      if (file.size > STOREFRONT_EDITOR_IMAGE_MAX_BYTES) {
        throw new Error(storefrontEditorImageTooLargeMessage());
      }
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(buildApiUrl("/api/storefront/theme-customizer/upload-image"), {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const data = await readJsonResponse<{ ok?: boolean; urls?: string[]; message?: string }>(res);
      if (!res.ok || !data.ok || !data.urls?.[0]) throw new Error(data.message ?? t("Upload failed."));
      setSiteIdentity((s) => ({ ...s, [field]: data.urls![0] }));
      setStatus(t("Image uploaded. Publish to apply on the live shop."));
    },
    [buildApiUrl, t],
  );

  const save = async () => {
    const tid = themeId.trim();
    const vid = themeVersionId.trim();
    if (!tid || !vid) return;
    if (!tokensDirty && !contentDirty && !identityDirty) return;
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const imagesToSave = (contentState.images ?? []).filter((r) => r.sourceUrl.trim() !== "");
      const textsToSave = (contentState.texts ?? []).filter((r) => r.find.trim() !== "");
      const slidesToSave = (contentState.heroSlider?.slides ?? []).filter(
        (s) =>
          s.imageUrl.trim() !== "" ||
          s.heading.trim() !== "" ||
          s.buttonText.trim() !== "" ||
          s.buttonHref.trim() !== "",
      );
      const intro = contentState.introSection ?? emptyIntroSection();
      const fp = contentState.featuredProducts ?? normalizeFeaturedProductsCustomizerState(undefined);
      const ba = contentState.beforeAfterSection ?? emptyBeforeAfterSection();
      const customizerPayload: ThemeCustomizerContentState = {
        images: imagesToSave,
        texts: textsToSave,
        heroSlider: { slides: slidesToSave },
        introSection: {
          heading: intro.heading.trim(),
          headingHighlightWord: intro.headingHighlightWord.trim(),
          buttonText: intro.buttonText.trim(),
          buttonHref: intro.buttonHref.trim(),
          bodyHtml: intro.bodyHtml.trim(),
        },
        featuredProducts: {
          showSpotlightSection: fp.showSpotlightSection !== false,
          prioritizeFeaturedInHomeGrid: fp.prioritizeFeaturedInHomeGrid === true,
        },
        beforeAfterSection: {
          subheading: ba.subheading.trim(),
          mainHeading: ba.mainHeading.trim(),
          beforeImageUrl: ba.beforeImageUrl.trim(),
          beforeImageAlt: ba.beforeImageAlt.trim(),
          beforeLabelSmall: ba.beforeLabelSmall.trim(),
          beforeLabelLarge: ba.beforeLabelLarge.trim(),
          afterImageUrl: ba.afterImageUrl.trim(),
          afterImageAlt: ba.afterImageAlt.trim(),
          afterLabelSmall: ba.afterLabelSmall.trim(),
          afterLabelLarge: ba.afterLabelLarge.trim(),
        },
        marqueeText: {
          text: (contentState.marqueeText ?? emptyMarqueeText()).text.trim(),
        },
        trustIconsSection: normalizeTrustIconsSectionState({
          columns: (contentState.trustIconsSection ?? emptyTrustIconsSection()).columns.map((c) => ({
            ...c,
            title: c.title.trim(),
            text: c.text.trim(),
          })),
        }),
        footerSection: (() => {
          const fs = contentState.footerSection ?? emptyFooterSection();
          return normalizeFooterCustomizerState({
            ...fs,
            mainBackgroundRgb: fs.mainBackgroundRgb.trim(),
            logoImageUrl: fs.logoImageUrl.trim(),
            columnATitle: fs.columnATitle.trim(),
            columnBTitle: fs.columnBTitle.trim(),
            columnALinks: fs.columnALinks.map((r) => ({
              ...r,
              label: r.label.trim(),
              href: r.href.trim(),
            })),
            columnBLinks: fs.columnBLinks.map((r) => ({
              ...r,
              label: r.label.trim(),
              href: r.href.trim(),
            })),
            phoneDisplay: fs.phoneDisplay.trim(),
            phoneHref: fs.phoneHref.trim(),
            emailDisplay: fs.emailDisplay.trim(),
            emailHref: fs.emailHref.trim(),
            newsletterHeading: fs.newsletterHeading.trim(),
            newsletterPlaceholder: fs.newsletterPlaceholder.trim(),
            socialLinks: (fs.socialLinks ?? []).map((r) => ({
              ...r,
              url: r.url.trim(),
            })),
            socialFacebook: fs.socialFacebook.trim(),
            socialTwitter: fs.socialTwitter.trim(),
            socialInstagram: fs.socialInstagram.trim(),
            socialYoutube: fs.socialYoutube.trim(),
            copyrightHtml: fs.copyrightHtml.trim(),
            subFooterBackgroundRgb: fs.subFooterBackgroundRgb.trim(),
            hideLocalization: fs.hideLocalization === true,
            hidePaymentIcons: fs.hidePaymentIcons === true,
          });
        })(),
        bundleSection: normalizeBundleSectionState({
          heading: (contentState.bundleSection ?? emptyBundleSection()).heading.trim(),
          headingHighlightWord: (contentState.bundleSection ?? emptyBundleSection()).headingHighlightWord.trim(),
          bodyHtml: (contentState.bundleSection ?? emptyBundleSection()).bodyHtml.trim(),
        }),
        topHeader: (() => {
          const th = contentState.topHeader ?? emptyTopHeader();
          return normalizeTopHeaderState({
            hidden: th.hidden === true,
            announcements: th.announcements.map((a) => ({
              ...a,
              text: a.text.trim(),
              href: a.href.trim(),
            })),
            social: {
              facebook: th.social.facebook.trim(),
              twitter: th.social.twitter.trim(),
              instagram: th.social.instagram.trim(),
              youtube: th.social.youtube.trim(),
            },
          });
        })(),
        socialLinks: (() => {
          const sl = contentState.socialLinks ?? emptySocialLinks();
          return normalizeSocialLinksState({
            facebook: sl.facebook.trim(),
            twitter: sl.twitter.trim(),
            instagram: sl.instagram.trim(),
            youtube: sl.youtube.trim(),
          });
        })(),
      };

      const body: Record<string, unknown> = { themeVersionId: vid };
      if (tokensDirty) body.tokens = tokens;
      if (contentDirty) body.customizerContent = customizerPayload;
      if (identityDirty) body.siteIdentity = siteIdentity;

      const res = await fetch(buildApiUrl(`/api/storefront/themes/${encodeURIComponent(tid)}`), {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readJsonResponse<{
        ok?: boolean;
        message?: string;
        data?: {
          versions?: Array<{ metadata?: unknown; styleTokens?: StyleToken[] }>;
          siteIdentity?: unknown;
        };
      }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Save failed");
      const v = data.data?.versions?.[0];
      if (v?.styleTokens && tokensDirty) {
        const list = Array.isArray(v.styleTokens) ? v.styleTokens : [];
        setTokens(list);
        setBaselineJson(JSON.stringify(list));
      } else if (tokensDirty) {
      setBaselineJson(JSON.stringify(tokens));
      }
      if (contentDirty) {
        const savedContent = normalizeThemeCustomizerContentState(customizerPayload);
        setContentState(savedContent);
        setBaselineContentJson(JSON.stringify(savedContent));
      }
      if (identityDirty) {
        const mergedIdentity = mergeSiteIdentityFromApi(data.data?.siteIdentity ?? siteIdentity);
        setSiteIdentity(mergedIdentity);
        setBaselineSiteIdentityJson(JSON.stringify(mergedIdentity));
      }
      setStatus(t("Saved. Reloading preview…"));
      setPreviewKey((k) => k + 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const scanHomeImages = useCallback(async () => {
    const tid = themeId.trim();
    if (!tid) return;
    setScanningContent(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/storefront/themes/${encodeURIComponent(tid)}/discover-home-content`), {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await readJsonResponse<{
        ok?: boolean;
        message?: string;
        imageUrls?: string[];
        heroSliderSlides?: HeroSliderSlideRow[];
        introSection?: IntroSectionState | null;
        beforeAfterSection?: BeforeAfterSectionState | null;
        marqueeText?: MarqueeTextCustomizerState | null;
        footerSection?: Record<string, unknown> | null;
        trustIconsSection?: Record<string, unknown> | null;
        bundleSection?: Record<string, unknown> | null;
        topHeader?: Record<string, unknown> | null;
        socialLinks?: Record<string, unknown> | null;
      }>(res);
      if (!res.ok || !data.ok) throw new Error(data.message ?? t("Scan failed"));
      const urls = Array.isArray(data.imageUrls) ? data.imageUrls : [];
      const heroSlides = Array.isArray(data.heroSliderSlides) ? data.heroSliderSlides : [];
      const scannedIntro = data.introSection;
      const introFromScan =
        scannedIntro &&
        typeof scannedIntro === "object" &&
        !Array.isArray(scannedIntro)
          ? {
              heading: typeof scannedIntro.heading === "string" ? scannedIntro.heading : "",
              headingHighlightWord:
                typeof scannedIntro.headingHighlightWord === "string" ? scannedIntro.headingHighlightWord : "",
              buttonText: typeof scannedIntro.buttonText === "string" ? scannedIntro.buttonText : "",
              buttonHref: typeof scannedIntro.buttonHref === "string" ? scannedIntro.buttonHref : "",
              bodyHtml: typeof scannedIntro.bodyHtml === "string" ? scannedIntro.bodyHtml : "",
            }
          : null;
      const hasIntroFields =
        introFromScan &&
        (introFromScan.heading.trim() !== "" ||
          introFromScan.headingHighlightWord.trim() !== "" ||
          introFromScan.buttonText.trim() !== "" ||
          introFromScan.buttonHref.trim() !== "" ||
          introFromScan.bodyHtml.trim() !== "");

      const scannedBa = data.beforeAfterSection;
      const baFromScan =
        scannedBa && typeof scannedBa === "object" && !Array.isArray(scannedBa)
          ? normalizeBeforeAfterSectionState(scannedBa)
          : null;
      const hasBaFields =
        baFromScan &&
        (baFromScan.subheading.trim() !== "" ||
          baFromScan.mainHeading.trim() !== "" ||
          baFromScan.beforeImageUrl.trim() !== "" ||
          baFromScan.beforeImageAlt.trim() !== "" ||
          baFromScan.beforeLabelSmall.trim() !== "" ||
          baFromScan.beforeLabelLarge.trim() !== "" ||
          baFromScan.afterImageUrl.trim() !== "" ||
          baFromScan.afterImageAlt.trim() !== "" ||
          baFromScan.afterLabelSmall.trim() !== "" ||
          baFromScan.afterLabelLarge.trim() !== "");

      const scannedMq = data.marqueeText;
      const mqFromScan =
        scannedMq && typeof scannedMq === "object" && !Array.isArray(scannedMq)
          ? normalizeMarqueeTextState(scannedMq)
          : null;
      const hasMqFields = mqFromScan && mqFromScan.text.trim() !== "";

      const rawFooter = data.footerSection;
      const footerFromScan =
        rawFooter && typeof rawFooter === "object" && !Array.isArray(rawFooter)
          ? normalizeFooterCustomizerState(rawFooter)
          : null;
      const hasFooterScan = footerFromScan != null && isFooterCustomizerActive(footerFromScan);

      const rawTrustIcons = data.trustIconsSection;
      const trustIconsFromScan =
        rawTrustIcons && typeof rawTrustIcons === "object" && !Array.isArray(rawTrustIcons)
          ? normalizeTrustIconsSectionState(rawTrustIcons)
          : null;
      const hasTrustIconsScan = trustIconsFromScan != null;

      const rawBundle = data.bundleSection;
      const bundleFromScan =
        rawBundle && typeof rawBundle === "object" && !Array.isArray(rawBundle)
          ? normalizeBundleSectionState(rawBundle)
          : null;
      const hasBundleScan =
        bundleFromScan != null &&
        (bundleFromScan.heading.trim() !== "" ||
          bundleFromScan.headingHighlightWord.trim() !== "" ||
          bundleFromScan.bodyHtml.trim() !== "");

      const rawTopHeader = data.topHeader;
      const topHeaderFromScan =
        rawTopHeader && typeof rawTopHeader === "object" && !Array.isArray(rawTopHeader)
          ? normalizeTopHeaderState(rawTopHeader)
          : null;
      const hasTopHeaderScan =
        topHeaderFromScan != null &&
        (topHeaderFromScan.announcements.length > 0 ||
          topHeaderFromScan.hidden === true ||
          topHeaderFromScan.social.facebook.trim() !== "" ||
          topHeaderFromScan.social.twitter.trim() !== "" ||
          topHeaderFromScan.social.instagram.trim() !== "" ||
          topHeaderFromScan.social.youtube.trim() !== "");

      const rawSocialLinks = data.socialLinks;
      const socialLinksFromScan =
        rawSocialLinks && typeof rawSocialLinks === "object" && !Array.isArray(rawSocialLinks)
          ? normalizeSocialLinksState(rawSocialLinks)
          : null;
      const hasSocialLinksScan =
        socialLinksFromScan != null &&
        (socialLinksFromScan.facebook.trim() !== "" ||
          socialLinksFromScan.twitter.trim() !== "" ||
          socialLinksFromScan.instagram.trim() !== "" ||
          socialLinksFromScan.youtube.trim() !== "");

      setContentState((prev) => {
        const images = [...(prev.images ?? [])];
        const seen = new Set(images.map((r) => r.sourceUrl.trim()));
        for (const url of urls) {
          const u = url.trim();
          if (!u || seen.has(u)) continue;
          const label = u.split("/").pop()?.split("?")[0] || u;
          images.push({ id: newId(), label, sourceUrl: u, replacementUrl: u });
          seen.add(u);
        }
        return {
          ...prev,
          images,
          heroSlider: {
            slides: heroSlides.length > 0 ? heroSlides : (prev.heroSlider?.slides ?? []),
          },
          introSection: hasIntroFields ? introFromScan! : (prev.introSection ?? emptyIntroSection()),
          beforeAfterSection: hasBaFields ? baFromScan! : (prev.beforeAfterSection ?? emptyBeforeAfterSection()),
          marqueeText: hasMqFields ? mqFromScan! : (prev.marqueeText ?? emptyMarqueeText()),
          trustIconsSection: hasTrustIconsScan
            ? trustIconsFromScan!
            : (prev.trustIconsSection ?? emptyTrustIconsSection()),
          footerSection: hasFooterScan ? footerFromScan! : (prev.footerSection ?? emptyFooterSection()),
          bundleSection: hasBundleScan ? bundleFromScan! : (prev.bundleSection ?? emptyBundleSection()),
          topHeader: hasTopHeaderScan ? topHeaderFromScan! : (prev.topHeader ?? emptyTopHeader()),
          socialLinks: hasSocialLinksScan ? socialLinksFromScan! : (prev.socialLinks ?? emptySocialLinks()),
        };
      });

      const foundParts: string[] = [];
      if (urls.length > 0) foundParts.push(`${urls.length} image URL(s)`);
      if (hasIntroFields) foundParts.push(t("Intro / about block"));
      if (hasBaFields) foundParts.push(t("Before & after section"));
      if (hasMqFields) foundParts.push(t("Scrolling marquee text"));
      if (hasFooterScan) foundParts.push(t("Footer"));
      if (hasTrustIconsScan) foundParts.push(t("Trust icons row"));
      if (hasBundleScan) foundParts.push(t("Bundle section"));
      if (hasTopHeaderScan) {
        const count = topHeaderFromScan!.announcements.length;
        foundParts.push(count > 0 ? `${count} top header announcement(s)` : t("Top header"));
      }
      if (hasSocialLinksScan) foundParts.push(t("Social media links"));
      if (heroSlides.length > 0) foundParts.push(`${heroSlides.length} hero slider slide(s)`);
      if (foundParts.length === 0) {
        setStatus(
          t(
            "No image URLs, hero slider, intro, before/after, marquee, trust icons, footer, top header, or bundle section data found. Publish the theme or open /shop once so index.html exists.",
          ),
        );
      } else {
        setStatus(t(`Found ${foundParts.join(", ")}. Publish to apply.`));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setScanningContent(false);
    }
  }, [buildApiUrl, themeId, t]);

  const updateImageRow = (id: string, patch: Partial<ThemeCustomizerImageRow>) => {
    setContentState((s) => ({
      ...s,
      images: (s.images ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeImageRow = (id: string) => {
    setContentState((s) => ({ ...s, images: (s.images ?? []).filter((r) => r.id !== id) }));
  };

  const updateTextRow = (id: string, patch: Partial<ThemeCustomizerTextRow>) => {
    setContentState((s) => ({
      ...s,
      texts: (s.texts ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeTextRow = (id: string) => {
    setContentState((s) => ({ ...s, texts: (s.texts ?? []).filter((r) => r.id !== id) }));
  };

  const addTextRow = () => {
    setContentState((s) => ({
      ...s,
      texts: [...(s.texts ?? []), { id: newId(), label: "", find: "", replace: "" }],
    }));
  };

  const addImageRow = () => {
    setContentState((s) => ({
      ...s,
      images: [...(s.images ?? []), { id: newId(), label: "", sourceUrl: "", replacementUrl: "" }],
    }));
  };

  const updateHeroSlide = (id: string, patch: Partial<HeroSliderSlideRow>) => {
    setContentState((s) => ({
      ...s,
      heroSlider: {
        slides: (s.heroSlider?.slides ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
      },
    }));
  };

  const uploadHeroSlideImage = useCallback(
    async (slideId: string, file: File | null) => {
      if (!file) return;
      if (file.size > STOREFRONT_EDITOR_IMAGE_MAX_BYTES) {
        setError(storefrontEditorImageTooLargeMessage());
        return;
      }
      setError(null);
      setHeroSlideUploading((m) => ({ ...m, [slideId]: true }));
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(buildApiUrl("/api/storefront/theme-customizer/upload-image"), {
          method: "POST",
          credentials: "same-origin",
          body: fd,
        });
        const data = await readJsonResponse<{ ok?: boolean; urls?: string[]; message?: string }>(res);
        if (!res.ok || !data.ok || !data.urls?.[0]) {
          throw new Error(data.message ?? t("Upload failed"));
        }
        const url = data.urls[0]!;
        setContentState((s) => ({
          ...s,
          heroSlider: {
            slides: (s.heroSlider?.slides ?? []).map((r) =>
              r.id === slideId ? { ...r, imageUrl: url } : r,
            ),
          },
        }));
        setStatus(t("Image uploaded. Publish to show it on the live shop."));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : t("Upload failed"));
      } finally {
        setHeroSlideUploading((m) => {
          const next = { ...m };
          delete next[slideId];
          return next;
        });
      }
    },
    [buildApiUrl, t],
  );

  const openHeroSlideFilePicker = (slideId: string) => {
    heroSlidePendingUploadIdRef.current = slideId;
    heroSlideFileInputRef.current?.click();
  };

  const onHeroSlideFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slideId = heroSlidePendingUploadIdRef.current;
    e.target.value = "";
    heroSlidePendingUploadIdRef.current = null;
    if (!file || !slideId) return;
    void uploadHeroSlideImage(slideId, file);
  };

  const uploadComparisonImage = useCallback(
    async (side: "before" | "after", file: File | null) => {
      if (!file) return;
      if (file.size > STOREFRONT_EDITOR_IMAGE_MAX_BYTES) {
        setError(storefrontEditorImageTooLargeMessage());
        return;
      }
      setError(null);
      setComparisonUploading((m) => ({ ...m, [side]: true }));
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(buildApiUrl("/api/storefront/theme-customizer/upload-image"), {
          method: "POST",
          credentials: "same-origin",
          body: fd,
        });
        const data = await readJsonResponse<{ ok?: boolean; urls?: string[]; message?: string }>(res);
        if (!res.ok || !data.ok || !data.urls?.[0]) {
          throw new Error(data.message ?? t("Upload failed"));
        }
        const url = data.urls[0]!;
        setContentState((s) => ({
          ...s,
          beforeAfterSection: {
            ...(s.beforeAfterSection ?? emptyBeforeAfterSection()),
            ...(side === "before" ? { beforeImageUrl: url } : { afterImageUrl: url }),
          },
        }));
        setStatus(t("Image uploaded. Publish to show it on the live shop."));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : t("Upload failed"));
      } finally {
        setComparisonUploading((m) => {
          const next = { ...m };
          delete next[side];
          return next;
        });
      }
    },
    [buildApiUrl, t],
  );

  const openComparisonFilePicker = (side: "before" | "after") => {
    comparisonPendingSideRef.current = side;
    comparisonFileInputRef.current?.click();
  };

  const onComparisonFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const side = comparisonPendingSideRef.current;
    e.target.value = "";
    comparisonPendingSideRef.current = null;
    if (!file || !side) return;
    void uploadComparisonImage(side, file);
  };

  const removeHeroSlide = (id: string) => {
    setContentState((s) => ({
      ...s,
      heroSlider: {
        slides: (s.heroSlider?.slides ?? []).filter((r) => r.id !== id),
      },
    }));
  };

  const addHeroSlide = () => {
    setContentState((s) => {
      const slides = [...(s.heroSlider?.slides ?? [])];
      const nextIndex =
        slides.length > 0 ? Math.max(...slides.map((x) => x.sortIndex), -1) + 1 : 0;
      slides.push({
        id: newId(),
        sortIndex: nextIndex,
        imageUrl: "",
        heading: "",
        buttonText: "",
        buttonHref: "",
      });
      return { ...s, heroSlider: { slides } };
    });
  };

  const updateIntroSection = (patch: Partial<IntroSectionState>) => {
    setContentState((s) => ({
      ...s,
      introSection: { ...(s.introSection ?? emptyIntroSection()), ...patch },
    }));
  };

  const updateBeforeAfterSection = (patch: Partial<BeforeAfterSectionState>) => {
    setContentState((s) => ({
      ...s,
      beforeAfterSection: { ...(s.beforeAfterSection ?? emptyBeforeAfterSection()), ...patch },
    }));
  };

  const updateMarqueeText = (patch: Partial<MarqueeTextCustomizerState>) => {
    setContentState((s) => ({
      ...s,
      marqueeText: { ...(s.marqueeText ?? emptyMarqueeText()), ...patch },
    }));
  };

  const updateTrustIconsColumn = (index: number, patch: Partial<TrustIconsColumn>) => {
    setContentState((s) => {
      const cur = normalizeTrustIconsSectionState(s.trustIconsSection);
      const cols = cur.columns.map((c, i) => (i === index ? { ...c, ...patch } : c));
      return { ...s, trustIconsSection: { columns: cols } };
    });
  };

  const updateFooterSection = (patch: Partial<FooterCustomizerState>) => {
    setContentState((s) => ({
      ...s,
      footerSection: normalizeFooterCustomizerState({
        ...(s.footerSection ?? emptyFooterSection()),
        ...patch,
      }),
    }));
  };

  const updateBundleSection = (patch: Partial<BundleSectionState>) => {
    setContentState((s) => ({
      ...s,
      bundleSection: normalizeBundleSectionState({
        ...(s.bundleSection ?? emptyBundleSection()),
        ...patch,
      }),
    }));
  };

  const updateTopHeader = (patch: Partial<TopHeaderCustomizerState>) => {
    setContentState((s) => ({
      ...s,
      topHeader: normalizeTopHeaderState({
        ...(s.topHeader ?? emptyTopHeader()),
        ...patch,
      }),
    }));
  };

  const updateSocialLinks = (patch: Partial<SocialLinksCustomizerState>) => {
    setContentState((s) => ({
      ...s,
      socialLinks: normalizeSocialLinksState({
        ...(s.socialLinks ?? emptySocialLinks()),
        ...patch,
      }),
    }));
  };

  const addTopHeaderAnnouncement = () => {
    setContentState((s) => {
      const cur = normalizeTopHeaderState(s.topHeader ?? emptyTopHeader());
      const id = `pf-tophdr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      return {
        ...s,
        topHeader: {
          ...cur,
          announcements: [...cur.announcements, { id, text: "", href: "" }],
        },
      };
    });
  };

  const updateTopHeaderAnnouncement = (id: string, patch: { text?: string; href?: string }) => {
    setContentState((s) => {
      const cur = normalizeTopHeaderState(s.topHeader ?? emptyTopHeader());
      return {
        ...s,
        topHeader: {
          ...cur,
          announcements: cur.announcements.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        },
      };
    });
  };

  const removeTopHeaderAnnouncement = (id: string) => {
    setContentState((s) => {
      const cur = normalizeTopHeaderState(s.topHeader ?? emptyTopHeader());
      return {
        ...s,
        topHeader: {
          ...cur,
          announcements: cur.announcements.filter((a) => a.id !== id),
        },
      };
    });
  };

  const previewTargetOrigin = previewOrigin?.trim() || (typeof window !== "undefined" ? window.location.origin : "");
  const previewSrc =
    typeof window !== "undefined"
      ? `${previewTargetOrigin}/shop?pf_preview=${previewKey}&pf_msg_parent=${encodeURIComponent(window.location.origin)}`
      : `${previewOrigin != null ? previewOrigin : ""}/shop?pf_preview=${previewKey}`;

  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [previewFrameHeight, setPreviewFrameHeight] = useState<number | null>(null);

  const measurePreviewIframeHeight = useCallback(() => {
    const doc = previewIframeRef.current?.contentDocument;
    if (!doc) return;
    const root = doc.querySelector(".shopify-liquid-root");
    const measured = Math.max(
      root instanceof HTMLElement ? root.scrollHeight : 0,
      root instanceof HTMLElement ? root.offsetHeight : 0,
      doc.body?.scrollHeight ?? 0,
      doc.documentElement?.scrollHeight ?? 0,
      doc.documentElement?.offsetHeight ?? 0,
    );
    if (measured > 0) setPreviewFrameHeight(Math.ceil(measured));
  }, []);

  const pushLivePreviewToIframe = useCallback(() => {
    if (typeof window === "undefined" || !previewTargetOrigin) return;
    const win = previewIframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      {
        type: STOREFRONT_CUSTOMIZER_LIVE_PREVIEW_MESSAGE_TYPE,
        themeAssetRouteId: themeVersionId.trim() || undefined,
        heroSlider: { slides: contentState.heroSlider?.slides ?? [] },
        beforeAfterSection: contentState.beforeAfterSection ?? emptyBeforeAfterSection(),
        trustIconsSection: contentState.trustIconsSection ?? emptyTrustIconsSection(),
        footerSection: contentState.footerSection ?? emptyFooterSection(),
        introSection: contentState.introSection ?? emptyIntroSection(),
        marqueeText: contentState.marqueeText ?? emptyMarqueeText(),
        bundleSection: contentState.bundleSection ?? emptyBundleSection(),
        topHeader: contentState.topHeader ?? emptyTopHeader(),
        socialLinks: contentState.socialLinks ?? emptySocialLinks(),
      },
      previewTargetOrigin,
    );
  }, [
    contentState.beforeAfterSection,
    contentState.heroSlider?.slides,
    contentState.trustIconsSection,
    contentState.footerSection,
    contentState.introSection,
    contentState.marqueeText,
    contentState.bundleSection,
    contentState.topHeader,
    contentState.socialLinks,
    previewTargetOrigin,
    themeVersionId,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setTimeout(pushLivePreviewToIframe, 150);
    return () => window.clearTimeout(id);
  }, [pushLivePreviewToIframe, previewKey]);

  useEffect(() => {
    setPreviewFrameHeight(null);
  }, [previewKey, previewSrc]);

  useEffect(() => {
    if (typeof window === "undefined" || !previewTargetOrigin) return;
    const allowedOrigins = new Set(
      [previewTargetOrigin, window.location.origin].filter(Boolean),
    );
    function onMessage(ev: MessageEvent) {
      if (!allowedOrigins.has(ev.origin)) return;
      const data = ev.data as { type?: string; height?: number } | null;
      if (
        data?.type === STOREFRONT_CUSTOMIZER_FRAME_HEIGHT_MESSAGE_TYPE &&
        typeof data.height === "number" &&
        data.height > 0
      ) {
        setPreviewFrameHeight(Math.ceil(data.height));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [previewTargetOrigin]);

  const handlePreviewIframeLoad = useCallback(() => {
    pushLivePreviewToIframe();
    measurePreviewIframeHeight();
  }, [measurePreviewIframeHeight, pushLivePreviewToIframe]);

  const subPanelTitle =
    customizerPanel === "menu"
      ? ""
      : (
          {
            "site-identity": t("Site identity"),
            "top-header": t("Top header"),
            "social-links": t("Social media"),
            "homepage-media": t("Homepage images & sliders"),
            "homepage-intro": t("Homepage intro"),
            "text-banners": t("Text & banners"),
            "featured-products": t("Featured products"),
            "marquee-text": t("Scrolling marquee"),
            "before-after": t("Before & after"),
            "trust-icons": t("Trust icons row"),
            footer: t("Footer"),
            bundle: t("Bundle section"),
          } as Record<Exclude<typeof customizerPanel, "menu">, string>
        )[customizerPanel];

  if (orgLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">{t("Loading…")}</span>
      </div>
    );
  }

  if (orgCtx?.isSuperadmin && !selectedOrgId) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-6 text-sm">
        {t("Select a company from Storefront → Themes before opening the customizer, or add ?organizationId= to the URL.")}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[min(720px,calc(100dvh-10rem))] flex-col overflow-hidden rounded-xl border border-border/80 bg-background shadow-sm">
      {/* WordPress-style customizer chrome */}
      <header className="flex h-[52px] shrink-0 items-center gap-2 border-b bg-card px-2 sm:gap-3 sm:px-4">
        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground" asChild title={t("Close")}>
          <Link href="/storefront/themes" aria-label={t("Close customizer")}>
            <X className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1 px-1 text-center sm:text-left">
          <p className="text-[11px] leading-tight text-muted-foreground">{t("You are customizing")}</p>
          <p className="truncate text-sm font-semibold leading-tight">{themeName || t("Storefront theme")}</p>
        </div>
        {orgCtx?.isSuperadmin ? (
          <Select
            value={selectedOrgId ?? "__none__"}
            onValueChange={(v) => {
              if (v === "__none__") return;
              setSelectedOrgId(v);
              try {
                window.localStorage.setItem(ORG_STORAGE_KEY, v);
              } catch {
                /* ignore */
              }
              void loadTheme();
            }}
          >
            <SelectTrigger className="h-9 max-w-[140px] text-xs sm:max-w-[200px]">
              <SelectValue placeholder={t("Company")} />
            </SelectTrigger>
            <SelectContent>
              {orgCtx.organizations.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Separator orientation="vertical" className="hidden h-8 sm:block" />
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden gap-1.5 sm:inline-flex"
            onClick={() => void loadTheme()}
            disabled={loading || seeding || !themeId.trim()}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span className="hidden md:inline">{t("Reload")}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden gap-1.5 lg:inline-flex"
            title={t("Re-read :root variables from the theme folder (overwrites token list in the database).")}
            disabled={seeding || !themeVersionId || saving}
            onClick={() => void seedStyleTokensFromFiles(true)}
          >
            {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">{t("Sync")}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saving || !dirty || !themeVersionId}
            onClick={() => void save()}
            className={cn(
              "min-w-[100px] gap-1.5 font-medium shadow-sm",
              dirty
                ? "bg-[#2271b1] text-white hover:bg-[#135e96]"
                : "cursor-default bg-muted text-muted-foreground hover:bg-muted",
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {dirty ? t("Publish") : t("Saved")}
          </Button>
        </div>
      </header>

      {error ? <div className="border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">{error}</div> : null}
      {status && !error ? <div className="border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">{status}</div> : null}

      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
        {sidebarCollapsed ? (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="fixed bottom-6 left-4 z-30 h-11 w-11 rounded-full shadow-lg"
            onClick={() => setSidebarCollapsed(false)}
            title={t("Show controls")}
            aria-label={t("Show controls")}
          >
            <PanelLeftOpen className="h-5 w-5" />
          </Button>
        ) : null}

        {/* Left — WordPress-style customizer panels */}
        {!sidebarCollapsed ? (
          <aside className="flex w-full flex-col border-b bg-[#f0f0f1] lg:w-[380px] lg:shrink-0 lg:border-b-0 lg:border-r dark:bg-muted/40">
            <div className="border-b border-border/60 bg-[#f0f0f1] px-4 py-3 dark:bg-muted/40">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Customize")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
                {customizerPanel === "menu"
                  ? t("Choose a section to edit the storefront. Click Publish when you are ready.")
                  : t("Adjust settings below, then Publish.")}
            </p>
          </div>

            {customizerPanel !== "menu" ? (
              <div className="flex items-start gap-1 border-b border-border/60 bg-card px-2 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-0.5 shrink-0"
                  onClick={() => setCustomizerPanel("menu")}
                  aria-label={t("Back")}
                  title={t("Back")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0 flex-1 pr-1">
                  <p className="text-[11px] font-normal leading-tight text-muted-foreground">{t("Customizing")}</p>
                  <p className="mt-0.5 truncate text-base font-semibold leading-snug text-foreground">{subPanelTitle}</p>
                </div>
              </div>
            ) : null}

            <ScrollArea className="h-[min(480px,52vh)] lg:h-[min(calc(100dvh-13rem),760px)]">
              <div className="pb-2">
                {customizerPanel === "menu" ? (
                  <nav className="flex flex-col" aria-label={t("Customizer sections")}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-3.5 text-left text-sm transition hover:bg-accent/50"
                      onClick={() => setCustomizerPanel("site-identity")}
                    >
                      <span className="flex items-center gap-2">
                        <Fingerprint className="h-4 w-4 opacity-70" />
                        {t("Site identity")}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-3.5 text-left text-sm transition hover:bg-accent/50"
                      onClick={() => setCustomizerPanel("top-header")}
                    >
                      <span className="flex items-center gap-2">
                        <Bell className="h-4 w-4 opacity-70" />
                        {t("Top header")}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-3.5 text-left text-sm transition hover:bg-accent/50"
                      onClick={() => setCustomizerPanel("social-links")}
                    >
                      <span className="flex items-center gap-2">
                        <Share2 className="h-4 w-4 opacity-70" />
                        {t("Social media")}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-3.5 text-left text-sm transition hover:bg-accent/50"
                      onClick={() => setCustomizerPanel("homepage-media")}
                    >
                      <span className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 opacity-70" />
                        {t("Homepage images & sliders")}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-3.5 text-left text-sm transition hover:bg-accent/50"
                      onClick={() => setCustomizerPanel("homepage-intro")}
                    >
                      <span className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 opacity-70" />
                        {t("Homepage intro")}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-3.5 text-left text-sm transition hover:bg-accent/50"
                      onClick={() => setCustomizerPanel("text-banners")}
                    >
                      <span className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4 opacity-70" />
                        {t("Text & banners")}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-3.5 text-left text-sm transition hover:bg-accent/50"
                      onClick={() => setCustomizerPanel("featured-products")}
                    >
                      <span className="flex items-center gap-2">
                        <Star className="h-4 w-4 opacity-70" />
                        {t("Featured products")}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-3.5 text-left text-sm transition hover:bg-accent/50"
                      onClick={() => setCustomizerPanel("marquee-text")}
                    >
                      <span className="flex items-center gap-2">
                        <ScrollText className="h-4 w-4 opacity-70" />
                        {t("Scrolling marquee")}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-3.5 text-left text-sm transition hover:bg-accent/50"
                      onClick={() => setCustomizerPanel("before-after")}
                    >
                      <span className="flex items-center gap-2">
                        <Columns2 className="h-4 w-4 opacity-70" />
                        {t("Before & after")}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-3.5 text-left text-sm transition hover:bg-accent/50"
                      onClick={() => setCustomizerPanel("trust-icons")}
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 opacity-70" />
                        {t("Trust icons row")}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-3.5 text-left text-sm transition hover:bg-accent/50"
                      onClick={() => setCustomizerPanel("footer")}
                    >
                      <span className="flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4 opacity-70" />
                        {t("Footer")}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-3.5 text-left text-sm transition hover:bg-accent/50"
                      onClick={() => setCustomizerPanel("bundle")}
                    >
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4 opacity-70" />
                        {t("Bundle section")}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                  </nav>
                ) : null}

                {customizerPanel === "site-identity" ? (
                  <div className="space-y-5 p-4">
                    <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                      <p className="text-xs text-muted-foreground">{t("Previewing theme")}</p>
                      <p className="mt-1 text-base font-semibold">{themeName || t("Theme")}</p>
                      <p className="mt-2 font-mono text-[11px] text-muted-foreground">{themeId ? `${t("Theme id")} ${themeId}` : null}</p>
                      {websiteId.trim() ? (
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{`${t("Website id")} ${websiteId}`}</p>
                      ) : null}
                    </div>

                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t(
                        "These settings apply across your storefront (live shop header, favicon, and lightweight Next.js shop views). Click Publish to save.",
                      )}
                    </p>

                    <input
                      ref={siteIdentityLogoFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/x-icon,.jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                      className="hidden"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f) return;
                        setSiteIdentityLogoUploading(true);
                        setError(null);
                        void uploadSiteIdentityImage(f, "sf_logo_url")
                          .catch((err: unknown) => setError(err instanceof Error ? err.message : t("Upload failed")))
                          .finally(() => setSiteIdentityLogoUploading(false));
                      }}
                    />
                    <input
                      ref={siteIdentityFaviconFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/x-icon,.jpg,.jpeg,.png,.gif,.webp,.svg,.ico"
                      className="hidden"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (!f) return;
                        setSiteIdentityFaviconUploading(true);
                        setError(null);
                        void uploadSiteIdentityImage(f, "sf_favicon_url")
                          .catch((err: unknown) => setError(err instanceof Error ? err.message : t("Upload failed")))
                          .finally(() => setSiteIdentityFaviconUploading(false));
                      }}
                    />

                    <div className="space-y-2">
                      <Label className="text-xs">{t("Logo")}</Label>
                      <button
                        type="button"
                        className="flex min-h-[100px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground transition hover:bg-muted/35"
                        onClick={() => siteIdentityLogoFileRef.current?.click()}
                        disabled={siteIdentityLogoUploading}
                      >
                        {siteIdentity.sf_logo_url.trim() ? (
                          // eslint-disable-next-line @next/next/no-img-element -- merchant asset URL
                          <img
                            src={
                              typeof window !== "undefined" && siteIdentity.sf_logo_url.trim().startsWith("/")
                                ? `${window.location.origin}${siteIdentity.sf_logo_url.trim()}`
                                : siteIdentity.sf_logo_url.trim()
                            }
                            alt=""
                            className="max-h-16 max-w-full object-contain"
                          />
                        ) : null}
                        {siteIdentityLogoUploading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <span>{t("Select logo")}</span>
                        )}
                      </button>
                      <Input
                        value={siteIdentity.sf_logo_url}
                        onChange={(e) =>
                          setSiteIdentity((s) => ({
                            ...s,
                            sf_logo_url: e.target.value,
                          }))
                        }
                        placeholder={t("Or paste image URL…")}
                        className="font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pf-si-store-name" className="text-xs">
                        {t("Site title")}
                      </Label>
                      <Input
                        id="pf-si-store-name"
                        value={siteIdentity.sf_store_name}
                        onChange={(e) =>
                          setSiteIdentity((s) => ({
                            ...s,
                            sf_store_name: e.target.value,
                          }))
                        }
                        placeholder={t("Store name")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pf-si-tagline" className="text-xs">
                        {t("Tagline")}
                      </Label>
                      <Input
                        id="pf-si-tagline"
                        value={siteIdentity.sf_site_tagline}
                        onChange={(e) =>
                          setSiteIdentity((s) => ({
                            ...s,
                            sf_site_tagline: e.target.value,
                          }))
                        }
                        placeholder={t("Short line under the title")}
                      />
                    </div>

                    <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-card px-3 py-2.5">
                      <Checkbox
                        id="pf-si-display-title"
                        checked={siteIdentity.sf_display_site_title_tagline !== "0"}
                        onCheckedChange={(c) =>
                          setSiteIdentity((s) => ({
                            ...s,
                            sf_display_site_title_tagline: c === true ? "1" : "0",
                          }))
                        }
                      />
                      <Label htmlFor="pf-si-display-title" className="cursor-pointer text-xs font-normal leading-snug">
                        {t("Display site title and tagline")}
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">{t("Site icon")}</Label>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {t("Shown in browser tabs and bookmarks. Use a square image;")}
                        <strong className="font-medium text-foreground"> 512 × 512 </strong>
                        {t("pixels or larger works best.")}
                      </p>
                      <button
                        type="button"
                        className="flex min-h-[88px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground transition hover:bg-muted/35"
                        onClick={() => siteIdentityFaviconFileRef.current?.click()}
                        disabled={siteIdentityFaviconUploading}
                      >
                        {siteIdentity.sf_favicon_url.trim() ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={
                              typeof window !== "undefined" && siteIdentity.sf_favicon_url.trim().startsWith("/")
                                ? `${window.location.origin}${siteIdentity.sf_favicon_url.trim()}`
                                : siteIdentity.sf_favicon_url.trim()
                            }
                            alt=""
                            className="h-10 w-10 rounded object-contain"
                          />
                        ) : null}
                        {siteIdentityFaviconUploading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <span>{t("Select site icon")}</span>
                        )}
                      </button>
                      <Input
                        value={siteIdentity.sf_favicon_url}
                        onChange={(e) =>
                          setSiteIdentity((s) => ({
                            ...s,
                            sf_favicon_url: e.target.value,
                          }))
                        }
                        placeholder={t("Or paste favicon URL…")}
                        className="font-mono text-xs"
                      />
                    </div>

                    <Separator />

                    <p className="text-xs text-muted-foreground">
                      {t("Domains and advanced storefront options:")}{" "}
                      <Link href="/storefront/websites" className="text-primary underline">
                        {t("Websites & domains")}
                      </Link>
                      {" · "}
                      <Link href="/storefront/settings" className="text-primary underline">
                        {t("Storefront settings")}
                      </Link>
                    </p>
                  </div>
                ) : null}

                {customizerPanel === "homepage-media" ? (
            <div className="space-y-6 p-4">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t(
                        "Scan loads image URLs and (for Concept themes) hero slideshow slides from index.html. Publish saves overrides to the live /shop HTML.",
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="gap-1.5"
                        disabled={scanningContent || !themeVersionId || loading}
                        onClick={() => void scanHomeImages()}
                      >
                        {scanningContent ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
                        {t("Scan homepage")}
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={addImageRow}>
                        <Plus className="h-3.5 w-3.5" />
                        {t("Add image row")}
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={addHeroSlide}>
                        <Plus className="h-3.5 w-3.5" />
                        {t("Add slider slide")}
                      </Button>
                    </div>

                    <div className="space-y-3 border-b border-border/60 pb-6">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Hero slider")}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {t(
                          "Each slide matches one carousel panel (image, headline, CTA). Upload a slide image or paste a URL under Advanced. Publish saves to live /shop.",
                        )}
                      </p>
                      {(contentState.heroSlider?.slides ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('No slides yet. Click “Scan homepage” or “Add slider slide”.')}</p>
                      ) : null}
                      <input
                        ref={heroSlideFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.svg"
                        className="hidden"
                        onChange={onHeroSlideFileInputChange}
                      />
                      <div className="space-y-4">
                        {[...(contentState.heroSlider?.slides ?? [])]
                          .sort((a, b) => a.sortIndex - b.sortIndex)
                          .map((slide) => (
                            <div key={slide.id} className="space-y-3 rounded-lg border border-border/60 bg-card p-3 shadow-sm">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-foreground">
                                  {t("Slide")} {slide.sortIndex + 1}
                                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                                    (index {slide.sortIndex})
                                  </span>
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeHeroSlide(slide.id)}
                                  aria-label={t("Remove slide")}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                <div className="space-y-2">
                                <Label className="text-[11px] text-muted-foreground">{t("Slide image")}</Label>
                                <div className="flex max-h-[140px] min-h-[96px] items-center justify-center overflow-hidden rounded-md border border-border/80 bg-muted/40">
                                  {heroSlideImagePreviewUrl(slide.imageUrl, themeVersionId) ? (
                                    // eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary catalog/theme URLs
                                    <img
                                      src={heroSlideImagePreviewUrl(slide.imageUrl, themeVersionId)}
                                      alt=""
                                      className="max-h-[140px] w-full object-contain"
                                    />
                                  ) : (
                                    <span className="px-3 text-center text-[11px] text-muted-foreground">
                                      {t("No image yet — upload or use Advanced.")}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    className="gap-1.5"
                                    disabled={!!heroSlideUploading[slide.id]}
                                    onClick={() => openHeroSlideFilePicker(slide.id)}
                                  >
                                    {heroSlideUploading[slide.id] ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Upload className="h-3.5 w-3.5" />
                                    )}
                                    {t("Upload image")}
                    </Button>
                                  {slide.imageUrl.trim() ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 text-xs text-muted-foreground"
                                      onClick={() => updateHeroSlide(slide.id, { imageUrl: "" })}
                                    >
                                      {t("Clear image")}
                                    </Button>
                                  ) : null}
                                </div>
                                <Collapsible className="rounded-md border border-border/60 bg-muted/20 px-2 py-1">
                                  <CollapsibleTrigger className="flex w-full items-center gap-2 py-1.5 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground [&[data-state=open]>svg]:rotate-90">
                                    <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform" />
                                    {t("Advanced: image URL")}
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="pb-2 pt-0">
                                    <Textarea
                                      value={slide.imageUrl}
                                      onChange={(e) => updateHeroSlide(slide.id, { imageUrl: e.target.value })}
                                      rows={2}
                                      className="min-h-[52px] font-mono text-[11px]"
                                      spellCheck={false}
                                      placeholder={t("https://… or /uploads/…")}
                                    />
                                  </CollapsibleContent>
                                </Collapsible>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">{t("Heading")}</Label>
                                <Input
                                  value={slide.heading}
                                  onChange={(e) => updateHeroSlide(slide.id, { heading: e.target.value })}
                                  className="h-9 text-xs"
                                  placeholder={t("PHILLY WATER ICE")}
                                />
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <Label className="text-[11px] text-muted-foreground">{t("Button text")}</Label>
                                  <Input
                                    value={slide.buttonText}
                                    onChange={(e) => updateHeroSlide(slide.id, { buttonText: e.target.value })}
                                    className="h-9 text-xs"
                                    placeholder={t("See Flavors")}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[11px] text-muted-foreground">{t("Button link")}</Label>
                                  <Input
                                    value={slide.buttonHref}
                                    onChange={(e) => updateHeroSlide(slide.id, { buttonHref: e.target.value })}
                                    className="h-9 font-mono text-[11px]"
                                    placeholder="/shop/collections/all"
                                    spellCheck={false}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Other images (advanced)")}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {t("Exact find/replace for any img URL or asset — use when not covered by the hero slider above.")}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {(contentState.images ?? []).map((row) => (
                        <div key={row.id} className="space-y-2 rounded-lg border border-border/60 bg-card p-3 shadow-sm">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-[11px] text-muted-foreground">{t("Label (optional)")}</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeImageRow(row.id)}
                              aria-label={t("Remove row")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <Input
                            value={row.label ?? ""}
                            onChange={(e) => updateImageRow(row.id, { label: e.target.value })}
                            className="h-8 text-xs"
                            placeholder={t("e.g. Hero slide 1")}
                          />
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">{t("Current URL (find)")}</Label>
                            <Textarea
                              value={row.sourceUrl}
                              onChange={(e) => updateImageRow(row.id, { sourceUrl: e.target.value })}
                              rows={2}
                              className="min-h-[52px] font-mono text-[11px]"
                              spellCheck={false}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">{t("New URL")}</Label>
                            <Textarea
                              value={row.replacementUrl}
                              onChange={(e) => updateImageRow(row.id, { replacementUrl: e.target.value })}
                              rows={2}
                              className="min-h-[52px] font-mono text-[11px]"
                              spellCheck={false}
                              placeholder={t("https://… or /storefront/…")}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}

                {customizerPanel === "homepage-intro" ? (
                  <div className="space-y-4 p-4">
                    <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                      <p className="text-xs font-semibold text-foreground">{t("About / story block")}</p>
                      <p className="mt-2 text-xs italic leading-relaxed text-muted-foreground">
                        {t(
                          "The section between the hero and the product grid (Concept themes: collage-small with rich text).",
                    )}
                  </p>
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                        {t(
                          "Publish saves these fields into your theme HTML overrides. Use Scan homepage under Homepage images & sliders to load current text from your theme file.",
                        )}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-sm font-semibold" htmlFor="pf-intro-heading">
                            {t("Heading")}
                          </Label>
                          <p className="text-[11px] italic text-muted-foreground">
                            {t("Full headline as visitors should read it (including the word you want underlined).")}
                          </p>
                          <Input
                            id="pf-intro-heading"
                            value={contentState.introSection?.heading ?? ""}
                            onChange={(e) => updateIntroSection({ heading: e.target.value })}
                            className="h-9 text-xs"
                            placeholder={t("We believe in the power of sound")}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-semibold" htmlFor="pf-intro-highlight">
                            {t("Underlined word or phrase")}
                          </Label>
                          <p className="text-[11px] italic text-muted-foreground">
                            {t(
                              "Must match exactly one part of the heading. Keeps the decorative scribble underline from the theme. Leave empty for a plain title.",
                            )}
                          </p>
                          <Input
                            id="pf-intro-highlight"
                            value={contentState.introSection?.headingHighlightWord ?? ""}
                            onChange={(e) => updateIntroSection({ headingHighlightWord: e.target.value })}
                            className="h-9 text-xs"
                            placeholder={t("sound")}
                            spellCheck={false}
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-sm font-semibold" htmlFor="pf-intro-btn-text">
                              {t("Button text")}
                            </Label>
                            <Input
                              id="pf-intro-btn-text"
                              value={contentState.introSection?.buttonText ?? ""}
                              onChange={(e) => updateIntroSection({ buttonText: e.target.value })}
                              className="h-9 text-xs"
                              placeholder={t("Our Story")}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm font-semibold" htmlFor="pf-intro-btn-href">
                              {t("Button link")}
                            </Label>
                            <Input
                              id="pf-intro-btn-href"
                              value={contentState.introSection?.buttonHref ?? ""}
                              onChange={(e) => updateIntroSection({ buttonHref: e.target.value })}
                              className="h-9 font-mono text-[11px]"
                              placeholder="/shop/pages/about"
                              spellCheck={false}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-semibold">{t("Body column")}</Label>
                          <p className="text-[11px] text-muted-foreground">
                            {t("Rich text for the right-hand column (paragraphs, lists, links). Matches your live theme HTML on Publish.")}
                          </p>
                          <RichTextEditor
                            content={contentState.introSection?.bodyHtml ?? ""}
                            onChange={(html) => updateIntroSection({ bodyHtml: html })}
                            placeholder={t("Tell your brand story…")}
                            className="min-h-[200px] text-sm [&_.ProseMirror]:min-h-[160px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {customizerPanel === "text-banners" ? (
                  <div className="space-y-6 p-4">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t("Swap headline or banner text. The Find field must match the HTML on /shop exactly (including spaces).")}
                    </p>
                    <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={addTextRow}>
                      <Plus className="h-3.5 w-3.5" />
                      {t("Add text swap")}
                    </Button>
                    <div className="space-y-3">
                      {(contentState.texts ?? []).map((row) => (
                        <div key={row.id} className="space-y-2 rounded-lg border border-border/60 bg-card p-3 shadow-sm">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-[11px] text-muted-foreground">{t("Label (optional)")}</Label>
                  <Button
                    type="button"
                              variant="ghost"
                    size="sm"
                              className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeTextRow(row.id)}
                              aria-label={t("Remove row")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                          </div>
                          <Input
                            value={row.label ?? ""}
                            onChange={(e) => updateTextRow(row.id, { label: e.target.value })}
                            className="h-8 text-xs"
                            placeholder={t("e.g. Promo banner")}
                          />
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">{t("Find")}</Label>
                            <Textarea
                              value={row.find}
                              onChange={(e) => updateTextRow(row.id, { find: e.target.value })}
                              rows={2}
                              className="min-h-[52px] text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">{t("Replace with")}</Label>
                            <Textarea
                              value={row.replace}
                              onChange={(e) => updateTextRow(row.id, { replace: e.target.value })}
                              rows={2}
                              className="min-h-[52px] text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                </div>
              ) : null}

                {customizerPanel === "featured-products" ? (
                  <div className="space-y-4 p-4">
                    <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                      <p className="text-xs font-semibold text-foreground">{t("Featured products")}</p>
                      <p className="mt-2 text-xs italic leading-relaxed text-muted-foreground">
                        {t(
                          "Choose which catalog items are featured under Storefront → Products. Those choices work together with the options below.",
                        )}
                      </p>
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                        {t(
                          "When you click Publish, these settings are written into your theme’s HTML overrides so the live /shop homepage updates immediately—no separate theme upload.",
                        )}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold">{t("Homepage spotlight")}</p>
                          <p className="mt-1 text-[11px] italic leading-relaxed text-muted-foreground">
                            {t("Shows or hides the large featured-product strip at the top of the homepage (Concept themes).")}
                          </p>
                        </div>
                        <div className="flex gap-3 pt-1">
                          <Checkbox
                            id="pf-fp-spotlight"
                            className="mt-0.5"
                            checked={contentState.featuredProducts?.showSpotlightSection !== false}
                            onCheckedChange={(v) =>
                              setContentState((s) => ({
                                ...s,
                                featuredProducts: {
                                  ...(s.featuredProducts ?? normalizeFeaturedProductsCustomizerState(undefined)),
                                  showSpotlightSection: v === true,
                                },
                              }))
                            }
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <Label htmlFor="pf-fp-spotlight" className="cursor-pointer text-sm font-normal leading-snug">
                              {t("Display featured spotlight section")}
                            </Label>
                            <p id="pf-fp-spotlight-desc" className="text-[11px] leading-relaxed text-muted-foreground">
                              {t("Uncheck to hide the spotlight while keeping featured flags on products for other layouts.")}
                            </p>
                          </div>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold">{t("Flavor grid")}</p>
                          <p className="mt-1 text-[11px] italic leading-relaxed text-muted-foreground">
                            {t("Controls ordering of the homepage product carousel / flavor grid.")}
                          </p>
                        </div>
                        <div className="flex gap-3 pt-1">
                          <Checkbox
                            id="pf-fp-grid"
                            className="mt-0.5"
                            checked={contentState.featuredProducts?.prioritizeFeaturedInHomeGrid === true}
                            onCheckedChange={(v) =>
                              setContentState((s) => ({
                                ...s,
                                featuredProducts: {
                                  ...(s.featuredProducts ?? normalizeFeaturedProductsCustomizerState(undefined)),
                                  prioritizeFeaturedInHomeGrid: v === true,
                                },
                              }))
                            }
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <Label htmlFor="pf-fp-grid" className="cursor-pointer text-sm font-normal leading-snug">
                              {t("List featured products first")}
                            </Label>
                            <p id="pf-fp-grid-desc" className="text-[11px] leading-relaxed text-muted-foreground">
                              {t("When checked, items marked featured appear before other products in the grid.")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link href="/storefront/products">{t("Manage featured products")}</Link>
                    </Button>
                  </div>
                ) : null}

                {customizerPanel === "top-header" ? (() => {
                  const th = normalizeTopHeaderState(contentState.topHeader ?? emptyTopHeader());
                  return (
                    <div className="space-y-4 p-4">
                      <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                        <p className="text-xs font-semibold text-foreground">{t("Top header (announcement bar)")}</p>
                        <p className="mt-2 text-xs italic leading-relaxed text-muted-foreground">
                          {t(
                            "The dark strip at the very top of the storefront that holds social icons, a rotating message slider, and the language/currency switcher.",
                          )}
                        </p>
                        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                          {t(
                            "Use Scan homepage under Homepage images & sliders to load the current announcement messages from index.html.",
                          )}
                        </p>
                      </div>

                      <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <Label htmlFor="pf-tophdr-hidden" className="cursor-pointer text-sm font-semibold leading-snug">
                              {t("Hide announcement bar")}
                            </Label>
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                              {t("Toggle off the entire top strip on every storefront page.")}
                            </p>
                          </div>
                          <Switch
                            id="pf-tophdr-hidden"
                            checked={th.hidden === true}
                            onCheckedChange={(checked) => updateTopHeader({ hidden: checked === true })}
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{t("Announcement messages")}</p>
                            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                              {t("Each message rotates in the centre of the bar. Add a link to make a slide clickable.")}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 gap-1.5"
                            onClick={addTopHeaderAnnouncement}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {t("Add")}
                          </Button>
                        </div>

                        {th.announcements.length === 0 ? (
                          <p className="mt-3 rounded-md border border-dashed border-border/60 px-3 py-4 text-center text-[11px] text-muted-foreground">
                            {t("No announcements yet. Add one above, or run Scan homepage to import existing copy from index.html.")}
                          </p>
                        ) : (
                          <ul className="mt-3 space-y-3">
                            {th.announcements.map((slide, idx) => (
                              <li
                                key={slide.id}
                                className="rounded-md border border-border/60 bg-muted/40 p-3"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {`${t("Slide")} ${idx + 1}`}
                                  </p>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeTopHeaderAnnouncement(slide.id)}
                                    title={t("Remove slide")}
                                    aria-label={t("Remove slide")}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <div className="mt-2 space-y-2">
                                  <div className="space-y-1">
                                    <Label
                                      htmlFor={`pf-tophdr-text-${slide.id}`}
                                      className="text-[11px] font-medium text-foreground"
                                    >
                                      {t("Message")}
                                    </Label>
                                    <Input
                                      id={`pf-tophdr-text-${slide.id}`}
                                      value={slide.text}
                                      onChange={(e) =>
                                        updateTopHeaderAnnouncement(slide.id, { text: e.target.value })
                                      }
                                      placeholder={t("Save up to 60% with code BLACKFRIDAY")}
                                      className="h-9 text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label
                                      htmlFor={`pf-tophdr-href-${slide.id}`}
                                      className="text-[11px] font-medium text-foreground"
                                    >
                                      {t("Link (optional)")}
                                    </Label>
                                    <Input
                                      id={`pf-tophdr-href-${slide.id}`}
                                      value={slide.href}
                                      onChange={(e) =>
                                        updateTopHeaderAnnouncement(slide.id, { href: e.target.value })
                                      }
                                      placeholder="https://example.com/sale"
                                      className="h-9 text-sm"
                                    />
                                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                                      {t("Leave blank for plain copy. Otherwise the entire slide becomes clickable.")}
                                    </p>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4">
                        <p className="text-sm font-semibold text-foreground">{t("Social media links")}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {t(
                            "Social URLs are now managed centrally so they update everywhere — top header, floating sidebar, and footer — at once.",
                          )}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3 gap-1.5"
                          onClick={() => setCustomizerPanel("social-links")}
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          {t("Open Social media panel")}
                        </Button>
                      </div>
                    </div>
                  );
                })() : null}

                {customizerPanel === "social-links" ? (() => {
                  const sl = normalizeSocialLinksState(contentState.socialLinks ?? emptySocialLinks());
                  return (
                    <div className="space-y-4 p-4">
                      <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                        <p className="text-xs font-semibold text-foreground">{t("Social media links")}</p>
                        <p className="mt-2 text-xs italic leading-relaxed text-muted-foreground">
                          {t(
                            "One place to manage every social-platform link on the storefront. Whatever you set here is applied to the top announcement bar, the floating left sidebar, and the footer in one go.",
                          )}
                        </p>
                        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                          {t(
                            "Leave a field blank to fall back to whatever the theme (or a per-section panel) had before. Use Scan homepage under Homepage images & sliders to import existing URLs.",
                          )}
                        </p>
                      </div>

                      <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                        <div className="space-y-3">
                          {[
                            { key: "facebook" as const, label: t("Facebook"), placeholder: "https://facebook.com/your-page" },
                            { key: "twitter" as const, label: t("X (Twitter)"), placeholder: "https://x.com/your-handle" },
                            { key: "instagram" as const, label: t("Instagram"), placeholder: "https://instagram.com/your-handle" },
                            { key: "youtube" as const, label: t("YouTube"), placeholder: "https://youtube.com/@your-channel" },
                          ].map(({ key, label, placeholder }) => (
                            <div key={key} className="space-y-1">
                              <Label
                                htmlFor={`pf-social-${key}`}
                                className="text-[11px] font-medium text-foreground"
                              >
                                {label}
                              </Label>
                              <Input
                                id={`pf-social-${key}`}
                                type="url"
                                inputMode="url"
                                value={sl[key]}
                                onChange={(e) => updateSocialLinks({ [key]: e.target.value })}
                                placeholder={placeholder}
                                className="h-9 text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })() : null}

                {customizerPanel === "marquee-text" ? (
                  <div className="space-y-4 p-4">
                    <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                      <p className="text-xs font-semibold text-foreground">{t("Scrolling marquee")}</p>
                      <p className="mt-2 text-xs italic leading-relaxed text-muted-foreground">
                        {t(
                          "The large outline text that scrolls horizontally between sections (Concept themes: marquee-element with stencil style).",
                        )}
                      </p>
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                        {t(
                          "Publish updates all repeated copies in the loop. Use Scan homepage under Homepage images & sliders to read the current phrase from index.html.",
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold" htmlFor="pf-marquee-text">
                          {t("Marquee text")}
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          {t("Plain text only — appears in the outlined scrolling headline (e.g. your brand name).")}
                        </p>
                        <Textarea
                          id="pf-marquee-text"
                          value={contentState.marqueeText?.text ?? ""}
                          onChange={(e) => updateMarqueeText({ text: e.target.value })}
                          rows={3}
                          className="min-h-[72px] text-sm"
                          placeholder={t("Philly Water Ice")}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {customizerPanel === "before-after" ? (
                  <div className="space-y-4 p-4">
                    <input
                      ref={comparisonFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,.jpg,.jpeg,.png,.gif,.webp,.svg"
                      className="hidden"
                      onChange={onComparisonFileInputChange}
                    />
                    <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                      <p className="text-xs font-semibold text-foreground">{t("Before & after")}</p>
                      <p className="mt-2 text-xs italic leading-relaxed text-muted-foreground">
                        {t("Homepage image comparison slider (Concept themes: image-comparison).")}
                      </p>
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                        {t(
                          "Publish writes these values into your theme HTML. Run Scan homepage under Homepage images & sliders to load current URLs and copy from index.html.",
                        )}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                      <p className="text-sm font-semibold">{t("Section headings")}</p>
                      <div className="mt-3 space-y-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground" htmlFor="pf-ba-sub">
                            {t("Subheading")}
                          </Label>
                          <Input
                            id="pf-ba-sub"
                            value={contentState.beforeAfterSection?.subheading ?? ""}
                            onChange={(e) => updateBeforeAfterSection({ subheading: e.target.value })}
                            className="h-9 text-xs"
                            placeholder={t("Same cup, two moments")}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground" htmlFor="pf-ba-main">
                            {t("Main heading")}
                          </Label>
                          <Input
                            id="pf-ba-main"
                            value={contentState.beforeAfterSection?.mainHeading ?? ""}
                            onChange={(e) => updateBeforeAfterSection({ mainHeading: e.target.value })}
                            className="h-9 text-xs"
                            placeholder={t("Before & after")}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-3 rounded-lg border border-border/60 bg-card p-3 shadow-sm">
                        <p className="text-sm font-semibold">{t("Before (left)")}</p>
                        <div className="flex max-h-[140px] min-h-[96px] items-center justify-center overflow-hidden rounded-md border border-border/80 bg-muted/40">
                          {heroSlideImagePreviewUrl(
                            contentState.beforeAfterSection?.beforeImageUrl ?? "",
                            themeVersionId,
                          ) ? (
                            // eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary URLs
                            <img
                              src={heroSlideImagePreviewUrl(
                                contentState.beforeAfterSection?.beforeImageUrl ?? "",
                                themeVersionId,
                              )}
                              alt=""
                              className="max-h-[140px] w-full object-contain"
                            />
                          ) : (
                            <span className="px-3 text-center text-[11px] text-muted-foreground">
                              {t("No image yet")}
                    </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="gap-1.5"
                            disabled={!!comparisonUploading.before}
                            onClick={() => openComparisonFilePicker("before")}
                          >
                            {comparisonUploading.before ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            {t("Upload")}
                          </Button>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground" htmlFor="pf-ba-b-url">
                            {t("Image URL")}
                          </Label>
                          <Input
                            id="pf-ba-b-url"
                            value={contentState.beforeAfterSection?.beforeImageUrl ?? ""}
                            onChange={(e) => updateBeforeAfterSection({ beforeImageUrl: e.target.value })}
                            className="h-8 font-mono text-[11px]"
                            spellCheck={false}
                            placeholder={t("./assets/comparison/…")}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground" htmlFor="pf-ba-b-alt">
                            {t("Image alt text")}
                          </Label>
                          <Input
                            id="pf-ba-b-alt"
                            value={contentState.beforeAfterSection?.beforeImageAlt ?? ""}
                            onChange={(e) => updateBeforeAfterSection({ beforeImageAlt: e.target.value })}
                            className="h-8 text-xs"
                          />
                    </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground" htmlFor="pf-ba-b-sm">
                            {t("Caption line 1")}
                          </Label>
                          <Input
                            id="pf-ba-b-sm"
                            value={contentState.beforeAfterSection?.beforeLabelSmall ?? ""}
                            onChange={(e) => updateBeforeAfterSection({ beforeLabelSmall: e.target.value })}
                            className="h-8 text-xs"
                            placeholder={t("Philly Water Ice")}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground" htmlFor="pf-ba-b-lg">
                            {t("Caption line 2")}
                          </Label>
                          <Input
                            id="pf-ba-b-lg"
                            value={contentState.beforeAfterSection?.beforeLabelLarge ?? ""}
                            onChange={(e) => updateBeforeAfterSection({ beforeLabelLarge: e.target.value })}
                            className="h-8 text-xs"
                            placeholder={t("Ready for flavor")}
                          />
                        </div>
                      </div>

                      <div className="space-y-3 rounded-lg border border-border/60 bg-card p-3 shadow-sm">
                        <p className="text-sm font-semibold">{t("After (right)")}</p>
                        <div className="flex max-h-[140px] min-h-[96px] items-center justify-center overflow-hidden rounded-md border border-border/80 bg-muted/40">
                          {heroSlideImagePreviewUrl(
                            contentState.beforeAfterSection?.afterImageUrl ?? "",
                            themeVersionId,
                          ) ? (
                            // eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary URLs
                            <img
                              src={heroSlideImagePreviewUrl(
                                contentState.beforeAfterSection?.afterImageUrl ?? "",
                                themeVersionId,
                              )}
                              alt=""
                              className="max-h-[140px] w-full object-contain"
                            />
                          ) : (
                            <span className="px-3 text-center text-[11px] text-muted-foreground">
                              {t("No image yet")}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="gap-1.5"
                            disabled={!!comparisonUploading.after}
                            onClick={() => openComparisonFilePicker("after")}
                          >
                            {comparisonUploading.after ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            {t("Upload")}
                          </Button>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground" htmlFor="pf-ba-a-url">
                            {t("Image URL")}
                          </Label>
                          <Input
                            id="pf-ba-a-url"
                            value={contentState.beforeAfterSection?.afterImageUrl ?? ""}
                            onChange={(e) => updateBeforeAfterSection({ afterImageUrl: e.target.value })}
                            className="h-8 font-mono text-[11px]"
                            spellCheck={false}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground" htmlFor="pf-ba-a-alt">
                            {t("Image alt text")}
                          </Label>
                          <Input
                            id="pf-ba-a-alt"
                            value={contentState.beforeAfterSection?.afterImageAlt ?? ""}
                            onChange={(e) => updateBeforeAfterSection({ afterImageAlt: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground" htmlFor="pf-ba-a-sm">
                            {t("Caption line 1")}
                          </Label>
                          <Input
                            id="pf-ba-a-sm"
                            value={contentState.beforeAfterSection?.afterLabelSmall ?? ""}
                            onChange={(e) => updateBeforeAfterSection({ afterLabelSmall: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground" htmlFor="pf-ba-a-lg">
                            {t("Caption line 2")}
                          </Label>
                          <Input
                            id="pf-ba-a-lg"
                            value={contentState.beforeAfterSection?.afterLabelLarge ?? ""}
                            onChange={(e) => updateBeforeAfterSection({ afterLabelLarge: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {customizerPanel === "trust-icons" ? (
                  <div className="space-y-4 p-4">
                    <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                      <p className="text-xs font-semibold text-foreground">{t("Trust icons row")}</p>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {t(
                          "Four columns above the main footer (icons plus heading and short text). Use Scan homepage to load copy from the theme. Publish replaces content only when it differs from the built-in defaults.",
                        )}
                      </p>
                    </div>
                    {(contentState.trustIconsSection ?? emptyTrustIconsSection()).columns.map((col, idx) => (
                      <div key={idx} className="space-y-3 rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                        <p className="text-sm font-semibold">
                          {t("Column")} {idx + 1}
                        </p>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{t("Icon")}</Label>
                          <Select
                            value={col.icon}
                            onValueChange={(v) =>
                              updateTrustIconsColumn(idx, { icon: v as TrustIconsColumn["icon"] })
                            }
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TRUST_ICONS_ICON_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground" htmlFor={`pf-trust-title-${idx}`}>
                            {t("Heading")}
                          </Label>
                          <Input
                            id={`pf-trust-title-${idx}`}
                            value={col.title}
                            onChange={(e) => updateTrustIconsColumn(idx, { title: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground" htmlFor={`pf-trust-text-${idx}`}>
                            {t("Supporting text")}
                          </Label>
                          <Textarea
                            id={`pf-trust-text-${idx}`}
                            value={col.text}
                            onChange={(e) => updateTrustIconsColumn(idx, { text: e.target.value })}
                            rows={3}
                            className="min-h-0 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {customizerPanel === "footer" ? (
                  <div className="space-y-4 p-4">
                    <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                      <p className="text-xs font-semibold text-foreground">{t("Footer")}</p>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {t(
                          "Edit the main footer band (menus, contact, newsletter, social) and the lower copyright bar. Use Scan homepage to read the current theme footer from index.html.",
                        )}
                      </p>
                    </div>
                    {(() => {
                      const pf = contentState.footerSection ?? emptyFooterSection();
                      const setColLinks = (col: "a" | "b", links: FooterLinkRow[]) =>
                        updateFooterSection(col === "a" ? { columnALinks: links } : { columnBLinks: links });
                      const patchLink = (col: "a" | "b", id: string, patch: Partial<FooterLinkRow>) => {
                        const key = col === "a" ? "columnALinks" : "columnBLinks";
                        const list = [...(pf[key] ?? [])];
                        const i = list.findIndex((x) => x.id === id);
                        if (i === -1) return;
                        list[i] = { ...list[i]!, ...patch };
                        setColLinks(col, list);
                      };
                      const removeLink = (col: "a" | "b", id: string) => {
                        const key = col === "a" ? "columnALinks" : "columnBLinks";
                        setColLinks(
                          col,
                          (pf[key] ?? []).filter((x) => x.id !== id),
                        );
                      };
                      const addLink = (col: "a" | "b") => {
                        const key = col === "a" ? "columnALinks" : "columnBLinks";
                        setColLinks(col, [...(pf[key] ?? []), { id: newId(), label: "", href: "" }]);
                      };
                      const patchSocialLink = (id: string, patch: Partial<FooterSocialLinkRow>) => {
                        const list = [...(pf.socialLinks ?? [])];
                        const i = list.findIndex((x) => x.id === id);
                        if (i === -1) return;
                        list[i] = { ...list[i]!, ...patch };
                        updateFooterSection({ socialLinks: list });
                      };
                      const removeSocialLink = (id: string) => {
                        updateFooterSection({
                          socialLinks: (pf.socialLinks ?? []).filter((x) => x.id !== id),
                        });
                      };
                      const addSocialLink = () => {
                        updateFooterSection({
                          socialLinks: [
                            ...(pf.socialLinks ?? []),
                            { id: newId(), platform: "facebook", url: "" },
                          ],
                        });
                      };
                      const linkEditor = (col: "a" | "b", title: string) => {
                        const key = col === "a" ? "columnALinks" : "columnBLinks";
                        const links = pf[key] ?? [];
                        return (
                          <div className="space-y-2 rounded-lg border border-border/60 bg-card p-3 shadow-sm">
                            <p className="text-sm font-semibold">{title}</p>
                            {links.map((row) => (
                              <div key={row.id} className="flex flex-col gap-2 border-b border-border/40 pb-3 last:border-0">
                                <div className="flex gap-2">
                                  <Input
                                    value={row.label}
                                    onChange={(e) => patchLink(col, row.id, { label: e.target.value })}
                                    className="h-8 text-xs"
                                    placeholder={t("Label")}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 shrink-0 px-2 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeLink(col, row.id)}
                                    aria-label={t("Remove link")}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                                <Input
                                  value={row.href}
                                  onChange={(e) => patchLink(col, row.id, { href: e.target.value })}
                                  className="h-8 font-mono text-[11px]"
                                  placeholder="/shop/pages/about"
                                  spellCheck={false}
                                />
                              </div>
                            ))}
                            <Button type="button" size="sm" variant="outline" className="w-full gap-1" onClick={() => addLink(col)}>
                              <Plus className="h-3.5 w-3.5" />
                              {t("Add link")}
                            </Button>
                          </div>
                        );
                      };
                      return (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">{t("Main footer background")}</Label>
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="color"
                                  aria-label={t("Main footer background color")}
                                  className="h-9 w-11 cursor-pointer overflow-hidden rounded border border-border bg-background p-0.5"
                                  value={rgbTripletToHex(pf.mainBackgroundRgb)}
                                  onChange={(e) => {
                                    const triplet = hexToRgbTriplet(e.target.value);
                                    if (triplet) updateFooterSection({ mainBackgroundRgb: triplet });
                                  }}
                                />
                                <Input
                                  key={`main-bg-${pf.mainBackgroundRgb}`}
                                  defaultValue={rgbTripletToHex(pf.mainBackgroundRgb)}
                                  onBlur={(e) => {
                                    let v = e.target.value.trim();
                                    if (v && !v.startsWith("#")) v = `#${v}`;
                                    const triplet = hexToRgbTriplet(v);
                                    if (triplet) updateFooterSection({ mainBackgroundRgb: triplet });
                                  }}
                                  className="h-9 min-w-[7.5rem] flex-1 font-mono text-xs"
                                  placeholder="#2640af"
                                  spellCheck={false}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {t("Stored as theme RGB triplet (e.g. 38 64 175); hex is for editing.")}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">{t("Logo image URL")}</Label>
                              <Input
                                value={pf.logoImageUrl}
                                onChange={(e) => updateFooterSection({ logoImageUrl: e.target.value })}
                                className="h-9 font-mono text-xs"
                                spellCheck={false}
                              />
                            </div>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">{t("Column A heading")}</Label>
                              <Input
                                value={pf.columnATitle}
                                onChange={(e) => updateFooterSection({ columnATitle: e.target.value })}
                                className="h-9 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">{t("Column B heading")}</Label>
                              <Input
                                value={pf.columnBTitle}
                                onChange={(e) => updateFooterSection({ columnBTitle: e.target.value })}
                                className="h-9 text-xs"
                              />
                            </div>
                          </div>
                          <div className="grid gap-4 lg:grid-cols-2">
                            {linkEditor("a", t("Column A links"))}
                            {linkEditor("b", t("Column B links"))}
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">{t("Phone (display)")}</Label>
                              <Input
                                value={pf.phoneDisplay}
                                onChange={(e) => updateFooterSection({ phoneDisplay: e.target.value })}
                                className="h-9 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">{t("Phone (tel: link)")}</Label>
                              <Input
                                value={pf.phoneHref}
                                onChange={(e) => updateFooterSection({ phoneHref: e.target.value })}
                                className="h-9 font-mono text-xs"
                                placeholder="tel:+15551234567"
                                spellCheck={false}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">{t("Email (display)")}</Label>
                              <Input
                                value={pf.emailDisplay}
                                onChange={(e) => updateFooterSection({ emailDisplay: e.target.value })}
                                className="h-9 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">{t("Email (mailto: link)")}</Label>
                              <Input
                                value={pf.emailHref}
                                onChange={(e) => updateFooterSection({ emailHref: e.target.value })}
                                className="h-9 font-mono text-xs"
                                placeholder="mailto:hello@example.com"
                                spellCheck={false}
                              />
                            </div>
                          </div>
                          <div className="space-y-2 rounded-lg border border-border/60 bg-card p-3 shadow-sm">
                            <p className="text-sm font-semibold">{t("Newsletter")}</p>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">{t("Heading")}</Label>
                              <Input
                                value={pf.newsletterHeading}
                                onChange={(e) => updateFooterSection({ newsletterHeading: e.target.value })}
                                className="h-9 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">{t("Email placeholder")}</Label>
                              <Input
                                value={pf.newsletterPlaceholder}
                                onChange={(e) => updateFooterSection({ newsletterPlaceholder: e.target.value })}
                                className="h-9 text-xs"
                              />
                            </div>
                          </div>
                          <div className="space-y-2 rounded-lg border border-border/60 bg-card p-3 shadow-sm">
                            <p className="text-sm font-semibold">{t("Social links")}</p>
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                              {t("Add networks with an icon and URL. Expand each row to edit.")}
                            </p>
                            <div className="space-y-2">
                              {(pf.socialLinks ?? []).map((row) => {
                                const platLabel =
                                  FOOTER_SOCIAL_PLATFORM_OPTIONS.find((o) => o.value === row.platform)?.label ??
                                  row.platform;
                                const urlPreview = row.url.trim();
                                const summary = urlPreview
                                  ? urlPreview.length > 44
                                    ? `${urlPreview.slice(0, 44)}…`
                                    : urlPreview
                                  : t("No URL yet");
                                return (
                                  <Collapsible
                                    key={row.id}
                                    className="rounded-md border border-border/60 bg-muted/20 px-2 py-1"
                                  >
                                    <CollapsibleTrigger className="flex w-full items-center gap-2 py-1.5 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground [&[data-state=open]>svg:first-child]:rotate-90">
                                      <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform" />
                                      <span className="shrink-0 text-foreground">{platLabel}</span>
                                      <span className="min-w-0 truncate font-normal text-muted-foreground">{summary}</span>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-2 border-t border-border/40 pb-2 pt-2">
                                      <div className="space-y-1">
                                        <Label className="text-[11px] text-muted-foreground">{t("Icon / platform")}</Label>
                                        <Select
                                          value={row.platform}
                                          onValueChange={(v) =>
                                            patchSocialLink(row.id, { platform: v as FooterSocialPlatform })
                                          }
                                        >
                                          <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {FOOTER_SOCIAL_PLATFORM_OPTIONS.map((opt) => (
                                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                {opt.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-[11px] text-muted-foreground">{t("URL")}</Label>
                                        <Input
                                          value={row.url}
                                          onChange={(e) => patchSocialLink(row.id, { url: e.target.value })}
                                          className="h-9 font-mono text-[11px]"
                                          placeholder="https://"
                                          spellCheck={false}
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-full gap-1 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeSocialLink(row.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        {t("Remove link")}
                                      </Button>
                                    </CollapsibleContent>
                                  </Collapsible>
                                );
                              })}
                            </div>
                            <Button type="button" size="sm" variant="outline" className="w-full gap-1" onClick={addSocialLink}>
                              <Plus className="h-3.5 w-3.5" />
                              {t("Add social link")}
                            </Button>
                          </div>
                          <div className="space-y-2 rounded-lg border border-border/60 bg-card p-3 shadow-sm">
                            <p className="text-sm font-semibold">{t("Copyright bar")}</p>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">{t("Sub-footer background")}</Label>
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="color"
                                  aria-label={t("Sub-footer background color")}
                                  className="h-9 w-11 cursor-pointer overflow-hidden rounded border border-border bg-background p-0.5"
                                  value={rgbTripletToHex(pf.subFooterBackgroundRgb)}
                                  onChange={(e) => {
                                    const triplet = hexToRgbTriplet(e.target.value);
                                    if (triplet) updateFooterSection({ subFooterBackgroundRgb: triplet });
                                  }}
                                />
                                <Input
                                  key={`sub-bg-${pf.subFooterBackgroundRgb}`}
                                  defaultValue={rgbTripletToHex(pf.subFooterBackgroundRgb)}
                                  onBlur={(e) => {
                                    let v = e.target.value.trim();
                                    if (v && !v.startsWith("#")) v = `#${v}`;
                                    const triplet = hexToRgbTriplet(v);
                                    if (triplet) updateFooterSection({ subFooterBackgroundRgb: triplet });
                                  }}
                                  className="h-9 min-w-[7.5rem] flex-1 font-mono text-xs"
                                  placeholder="#0f172a"
                                  spellCheck={false}
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground">{t("Copyright HTML")}</Label>
                              <p className="text-[11px] text-muted-foreground">
                                {t("Trusted HTML inside the credits area (e.g. © line and optional links).")}
                              </p>
                              <Textarea
                                value={pf.copyrightHtml}
                                onChange={(e) => updateFooterSection({ copyrightHtml: e.target.value })}
                                rows={4}
                                className="min-h-[88px] font-mono text-[11px]"
                                spellCheck={false}
                              />
                            </div>
                            <div className="flex flex-col gap-3 pt-2">
                              <div className="flex items-center justify-between gap-2">
                                <Label className="text-xs" htmlFor="pf-footer-hide-loc">
                                  {t("Hide language / region selectors")}
                                </Label>
                                <Switch
                                  id="pf-footer-hide-loc"
                                  checked={pf.hideLocalization}
                                  onCheckedChange={(v) => updateFooterSection({ hideLocalization: v })}
                                />
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <Label className="text-xs" htmlFor="pf-footer-hide-pay">
                                  {t("Hide payment method icons")}
                                </Label>
                                <Switch
                                  id="pf-footer-hide-pay"
                                  checked={pf.hidePaymentIcons}
                                  onCheckedChange={(v) => updateFooterSection({ hidePaymentIcons: v })}
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : null}

                {customizerPanel === "bundle" ? (
                  <div className="space-y-4 p-4">
                    <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                      <p className="text-xs font-semibold text-foreground">{t("Build your bundle")}</p>
                      <p className="mt-2 text-xs italic leading-relaxed text-muted-foreground">
                        {t(
                          "Heading and description above the bundle product grid (Concept themes: collage block before the bundle cards).",
                        )}
                      </p>
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                        {t(
                          "Publish saves into your theme overrides. Use Scan homepage under Homepage images & sliders to load current copy from index.html.",
                        )}
                      </p>
                    </div>

                    <div className="rounded-lg border border-border/60 bg-card p-4 shadow-sm">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-sm font-semibold" htmlFor="pf-bundle-heading">
                            {t("Heading")}
                          </Label>
                          <p className="text-[11px] italic text-muted-foreground">
                            {t("Full headline as visitors read it, including the word that uses the theme underline.")}
                          </p>
                          <Input
                            id="pf-bundle-heading"
                            value={contentState.bundleSection?.heading ?? ""}
                            onChange={(e) => updateBundleSection({ heading: e.target.value })}
                            className="h-9 text-xs"
                            placeholder={t("Build your Bundle")}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-semibold" htmlFor="pf-bundle-highlight">
                            {t("Underlined word or phrase")}
                          </Label>
                          <p className="text-[11px] italic text-muted-foreground">
                            {t(
                              "Must match exactly one part of the heading. Keeps the decorative scribble from the theme. Leave empty for a plain title.",
                            )}
                          </p>
                          <Input
                            id="pf-bundle-highlight"
                            value={contentState.bundleSection?.headingHighlightWord ?? ""}
                            onChange={(e) => updateBundleSection({ headingHighlightWord: e.target.value })}
                            className="h-9 text-xs"
                            placeholder={t("Bundle")}
                            spellCheck={false}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm font-semibold">{t("Intro copy")}</Label>
                          <p className="text-[11px] text-muted-foreground">
                            {t("Shown under the heading (paragraphs, links). Matches live theme HTML on Publish.")}
                          </p>
                          <RichTextEditor
                            content={contentState.bundleSection?.bodyHtml ?? ""}
                            onChange={(html) => updateBundleSection({ bodyHtml: html })}
                            placeholder={t("Describe how bundling works…")}
                            className="min-h-[200px] text-sm [&_.ProseMirror]:min-h-[160px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
            </div>
          </ScrollArea>

            <div className="mt-auto border-t border-border/60 bg-[#f0f0f1] p-2 dark:bg-muted/40">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setSidebarCollapsed(true)}
              >
                <PanelLeftClose className="h-4 w-4" />
                {t("Collapse")}
              </Button>
            </div>
        </aside>
        ) : null}

        {/* Right — live preview (WordPress-style device chrome) */}
        <div className="flex min-h-0 flex-1 flex-col bg-neutral-200/80 dark:bg-muted/50">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Live preview")}</span>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="flex items-center rounded-md border border-border/60 bg-background p-0.5 shadow-sm">
                <Button
                  type="button"
                  variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPreviewDevice("desktop")}
                  title={t("Desktop")}
                  aria-label={t("Desktop")}
                  aria-pressed={previewDevice === "desktop"}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={previewDevice === "tablet" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPreviewDevice("tablet")}
                  title={t("Tablet")}
                  aria-label={t("Tablet")}
                  aria-pressed={previewDevice === "tablet"}
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPreviewDevice("mobile")}
                  title={t("Mobile")}
                  aria-label={t("Mobile")}
                  aria-pressed={previewDevice === "mobile"}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
              {!previewOrigin ? (
                <span className="max-w-[200px] text-right text-[11px] text-amber-900 dark:text-amber-200">
                  {t("Add a primary domain under Websites to preview your store hostname.")}
                </span>
              ) : (
                <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" asChild>
                  <a href={previewSrc} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t("Open")}
                  </a>
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPreviewKey((k) => k + 1)}
                title={t("Refresh preview")}
                aria-label={t("Refresh preview")}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3 sm:p-4">
            <div
              className={cn(
                "mx-auto w-full transition-[max-width] duration-300 ease-out",
                previewDevice === "tablet" && "max-w-[768px]",
                previewDevice === "mobile" && "max-w-[390px]",
              )}
            >
            <iframe
              ref={previewIframeRef}
              key={previewKey}
              title={t("Storefront preview")}
              src={previewSrc}
              onLoad={handlePreviewIframeLoad}
              style={previewFrameHeight ? { height: `${previewFrameHeight}px` } : undefined}
              className={cn(
                "w-full rounded-md bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-black/5",
                previewFrameHeight ? "min-h-0 border-0" : "h-full min-h-[min(420px,50vh)] border-0",
              )}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
