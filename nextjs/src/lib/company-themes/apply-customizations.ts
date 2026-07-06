import type { CompanyThemeCustomizerField } from "@/lib/company-themes/customizer-schema";
import { GLOBAL_PAGE } from "@/lib/company-themes/crimson-consulting-fields";
import { getImagePath } from "@/utils/image-path";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePagePath(path: string): string {
  if (!path || path === "/") return "/";
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

function fieldAppliesToPage(field: CompanyThemeCustomizerField, pagePath: string): boolean {
  if (field.page === GLOBAL_PAGE) return true;
  return normalizePagePath(field.page) === normalizePagePath(pagePath);
}

function replaceDocumentTitle(html: string, title: string): string {
  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  }
  return html.replace(/<head>/i, `<head><title>${title}</title>`);
}

function replaceElementIdContent(html: string, elementId: string, content: string): string {
  const rsLayer = new RegExp(
    `(<rs-layer\\s+id="${escapeRegex(elementId)}"[\\s\\S]*?>)\\s*([\\s\\S]*?)\\s*</rs-layer`,
    "i",
  );
  let output = html.replace(rsLayer, `$1${content}</rs-layer`);
  const anchor = new RegExp(`(<a\\s+id="${escapeRegex(elementId)}"[\\s\\S]*?>)\\s*([\\s\\S]*?)\\s*</a`, "i");
  output = output.replace(anchor, `$1${content}</a`);
  return output;
}

function replaceWidgetInner(html: string, widgetId: string, tag: string, content: string): string {
  const re = new RegExp(
    `(data-id="${escapeRegex(widgetId)}"[\\s\\S]*?<${tag}[^>]*>)([\\s\\S]*?)(</${tag}>)`,
    "i",
  );
  return html.replace(re, `$1${content}$3`);
}

function replaceWidgetByClass(
  html: string,
  widgetId: string,
  className: string,
  tag: string,
  content: string,
): string {
  const re = new RegExp(
    `(data-id="${escapeRegex(widgetId)}"[\\s\\S]*?<${tag}[^>]*class="[^"]*\\b${escapeRegex(className)}\\b[^"]*"[^>]*>)([\\s\\S]*?)(</${tag}>)`,
    "i",
  );
  return html.replace(re, `$1${content}$3`);
}

function replaceWidgetButtonText(html: string, widgetId: string, content: string): string {
  const re = new RegExp(
    `(data-id="${escapeRegex(widgetId)}"[\\s\\S]*?<span class="elementor-button-text"[^>]*>)([\\s\\S]*?)(</span>)`,
    "i",
  );
  return html.replace(re, `$1${content}$3`);
}

function replaceWidgetIhboxBtn(html: string, widgetId: string, content: string): string {
  const re = new RegExp(
    `(data-id="${escapeRegex(widgetId)}"[\\s\\S]*?<div class="dsvy-ihbox-btn"[\\s\\S]*?<span[^>]*>)([\\s\\S]*?)(</span>)`,
    "i",
  );
  return html.replace(re, `$1${content}$3`);
}

function replaceWidgetFidNumber(html: string, widgetId: string, content: string): string {
  const re = new RegExp(
    `(data-id="${escapeRegex(widgetId)}"[\\s\\S]*?<span\\s+class="dsvy-number-rotate"[^>]*data-to=")(\\d+)("[^>]*>)([\\s\\S]*?)(</span>)`,
    "i",
  );
  return html.replace(re, `$1${content}$3${content}$5`);
}

function replaceWidgetFidLabel(html: string, widgetId: string, content: string): string {
  const re = new RegExp(
    `(data-id="${escapeRegex(widgetId)}"[\\s\\S]*?<h3 class="dsvy-fid-title"[\\s\\S]*?<span[^>]*>)([\\s\\S]*?)(</span>)`,
    "i",
  );
  const withBreak = content.includes("<br") ? content : `${content}<br />`;
  return html.replace(re, `$1${withBreak}$3`);
}

function replaceByCssSelector(html: string, selector: string, content: string): string {
  const simple = selector.match(/^(\w+)?\.([\w-]+)$/);
  if (!simple) return html;
  const tag = simple[1] ?? "[^>]+";
  const cls = simple[2];
  const re = new RegExp(
    `(<${tag}[^>]*class="[^"]*\\b${escapeRegex(cls)}\\b[^"]*"[^>]*>)([\\s\\S]*?)(</${tag}>)`,
    "i",
  );
  return html.replace(re, `$1${content}$3`);
}

function replaceScopedInner(
  html: string,
  scopeClass: string,
  tag: string,
  innerClass: string,
  content: string,
): string {
  const re = new RegExp(
    `(class="[^"]*\\b${escapeRegex(scopeClass)}\\b[^"]*"[\\s\\S]*?<${tag}[^>]*class="[^"]*\\b${escapeRegex(innerClass)}\\b[^"]*"[^>]*>)([\\s\\S]*?)(</${tag}>)`,
    "i",
  );
  return html.replace(re, `$1${content}$3`);
}

function replacePlainText(html: string, search: string, replacement: string): string {
  return html.split(search).join(replacement);
}

function resolveCustomizerImageUrl(path: string): string {
  return getImagePath(path);
}

function replaceImgSrcByClass(html: string, className: string, url: string): string {
  const resolved = resolveCustomizerImageUrl(url);
  const re = new RegExp(
    `(<img[^>]*class="[^"]*\\b${escapeRegex(className)}\\b[^"]*"[^>]*\\ssrc=")([^"]*)(")`,
    "gi",
  );
  return html.replace(re, `$1${resolved}$3`);
}

function replaceSiteLogoMain(html: string, url: string): string {
  let output = replaceImgSrcByClass(html, "dsvy-main-logo", url);
  output = replaceImgSrcByClass(output, "dsvy-footer-logo", url);
  return output;
}

function replaceSiteLogoSticky(html: string, url: string): string {
  return replaceImgSrcByClass(html, "dsvy-sticky-logo", url);
}

function replaceSiteFavicon(html: string, url: string): string {
  const resolved = resolveCustomizerImageUrl(url);
  let output = html.replace(
    /(<link\s+rel="(?:icon|apple-touch-icon)"[^>]*\shref=")([^"]*)(")/gi,
    `$1${resolved}$3`,
  );
  output = output.replace(
    /(<meta\s+name="msapplication-TileImage"\s+content=")([^"]*)(")/gi,
    `$1${resolved}$3`,
  );
  return output;
}

function replaceSliderSlideImage(html: string, slideKey: string, url: string): string {
  const resolved = resolveCustomizerImageUrl(url);
  const slideMarker = new RegExp(`<rs-slide[^>]*data-key="${escapeRegex(slideKey)}"`, "i");
  const markerMatch = slideMarker.exec(html);
  if (!markerMatch || markerMatch.index === undefined) return html;

  const startIdx = markerMatch.index;
  const endTag = "</rs-slide>";
  const endIdx = html.indexOf(endTag, startIdx);
  if (endIdx === -1) return html;

  const before = html.slice(0, startIdx);
  let slideBlock = html.slice(startIdx, endIdx + endTag.length);
  const after = html.slice(endIdx + endTag.length);

  slideBlock = slideBlock.replace(/<img[^>]*class="[^"]*rev-slidebg[^"]*"[^>]*\/?>/i, (imgTag) => {
    let tag = imgTag;
    if (/\ssrc="/i.test(tag)) {
      tag = tag.replace(/\ssrc="[^"]*"/i, ` src="${resolved}"`);
    } else {
      tag = tag.replace(/<img/i, `<img src="${resolved}"`);
    }
    if (/\sdata-lazyload="/i.test(tag)) {
      tag = tag.replace(/\sdata-lazyload="[^"]*"/i, ` data-lazyload="${resolved}"`);
    } else {
      tag = tag.replace(/\/?>$/, ` data-lazyload="${resolved}$&`);
    }
    return tag;
  });

  slideBlock = slideBlock.replace(
    /(<rs-slide[^>]*\sdata-thumb=")([^"]*)(")/i,
    `$1${resolved}$3`,
  );

  return before + slideBlock + after;
}

function shouldApplyField(field: CompanyThemeCustomizerField, raw: string | undefined): boolean {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return false;
  if (field.type === "image") return true;
  return trimmed !== field.defaultValue.trim();
}

function injectCssVariables(html: string, variables: Record<string, string>): string {
  if (!Object.keys(variables).length) return html;
  const primary = variables["--pf-company-primary"] ?? "#c01120";
  const secondary = variables["--pf-company-secondary"] ?? "#0a1628";
  const rules = Object.entries(variables)
    .map(([key, value]) => `${key}: ${value};`)
    .join("\n  ");
  const block = `<style id="pf-company-theme-customizer">
:root {
  ${rules}
}
.dsvy-globalcolor,
.elementor-element.dsvy-elementor-bg-color-globalcolor,
.dsvy-elementor-bg-color-globalcolor {
  background-color: var(--pf-company-primary, ${primary}) !important;
}
.dsvy-footer-section,
.dsvy-elementor-bg-color-blackish,
.site-footer {
  background-color: var(--pf-company-secondary, ${secondary}) !important;
}
.dsvy-header-style-2 .dsvy-sticky-on,
.dsvy-header-style-2 .dsvy-header-wrapper {
  background-color: var(--pf-company-secondary, ${secondary});
}
</style>`;
  if (html.includes('id="pf-company-theme-customizer"')) {
    return html.replace(/<style id="pf-company-theme-customizer">[\s\S]*?<\/style>/i, block);
  }
  return html.replace(/<\/head>/i, `${block}</head>`);
}

function applyField(html: string, field: CompanyThemeCustomizerField, value: string, pagePath: string): string {
  const content = value.trim();
  if (!content) return html;

  switch (field.target.kind) {
    case "document-title": {
      const targetPage = field.target.page ?? GLOBAL_PAGE;
      if (targetPage !== GLOBAL_PAGE && normalizePagePath(targetPage) !== normalizePagePath(pagePath)) {
        return html;
      }
      return replaceDocumentTitle(html, content);
    }
    case "element-id":
      return replaceElementIdContent(html, field.target.elementId, content);
    case "widget":
      return replaceWidgetInner(html, field.target.widgetId, field.target.tag, content);
    case "widget-class":
      return replaceWidgetByClass(
        html,
        field.target.widgetId,
        field.target.className,
        field.target.tag,
        content,
      );
    case "widget-button":
      return replaceWidgetButtonText(html, field.target.widgetId, content);
    case "widget-ihbox-btn":
      return replaceWidgetIhboxBtn(html, field.target.widgetId, content);
    case "widget-fid-number":
      return replaceWidgetFidNumber(html, field.target.widgetId, content);
    case "widget-fid-label":
      return replaceWidgetFidLabel(html, field.target.widgetId, content);
    case "css-selector":
      return replaceByCssSelector(html, field.target.selector, content);
    case "text-replace":
      return replacePlainText(html, field.target.search, content);
    case "scoped-inner":
      return replaceScopedInner(
        html,
        field.target.scopeClass,
        field.target.tag,
        field.target.innerClass,
        content,
      );
    case "site-logo-main":
      return replaceSiteLogoMain(html, content);
    case "site-logo-sticky":
      return replaceSiteLogoSticky(html, content);
    case "site-favicon":
      return replaceSiteFavicon(html, content);
    case "slider-slide-image":
      return replaceSliderSlideImage(html, field.target.slideKey, content);
    case "css-var":
      return html;
    default:
      return html;
  }
}

export function applyCompanyThemeCustomizations(
  html: string,
  fields: CompanyThemeCustomizerField[],
  values: Record<string, string>,
  pagePath = "/",
): string {
  let output = html;
  const cssVars: Record<string, string> = {};
  const normalizedPath = normalizePagePath(pagePath);

  for (const field of fields) {
    if (!fieldAppliesToPage(field, normalizedPath)) continue;

    const raw = values[field.id];
    if (!shouldApplyField(field, raw)) continue;

    if (field.target.kind === "css-var") {
      cssVars[field.target.variable] = raw.trim();
      continue;
    }

    if (field.target.kind === "document-title") {
      const targetPage = field.target.page ?? GLOBAL_PAGE;
      if (targetPage !== GLOBAL_PAGE && normalizePagePath(targetPage) !== normalizedPath) {
        continue;
      }
    }

    output = applyField(output, field, raw!.trim(), normalizedPath);
  }

  return injectCssVariables(output, cssVars);
}
