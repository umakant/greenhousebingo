import { CRIMSON_FIELDS, CRIMSON_PANELS, GLOBAL_PAGE } from "@/lib/company-themes/crimson-consulting-fields";

export type CompanyThemeFieldType = "text" | "textarea" | "color" | "image" | "url";

export type CompanyThemeApplyTarget =
  | { kind: "document-title"; page?: string }
  | { kind: "element-id"; elementId: string }
  | { kind: "widget"; widgetId: string; tag: string }
  | { kind: "widget-class"; widgetId: string; className: string; tag: string }
  | { kind: "widget-button"; widgetId: string }
  | { kind: "widget-ihbox-btn"; widgetId: string }
  | { kind: "widget-fid-number"; widgetId: string }
  | { kind: "widget-fid-label"; widgetId: string }
  | { kind: "css-selector"; selector: string }
  | { kind: "scoped-inner"; scopeClass: string; tag: string; innerClass: string }
  | { kind: "text-replace"; search: string }
  | { kind: "site-logo-main" }
  | { kind: "site-logo-sticky" }
  | { kind: "site-favicon" }
  | { kind: "slider-slide-image"; slideKey: string }
  | { kind: "css-var"; variable: string };

export type CompanyThemeCustomizerField = {
  id: string;
  label: string;
  panelId: string;
  page: string;
  type: CompanyThemeFieldType;
  target: CompanyThemeApplyTarget;
  defaultValue: string;
  helpText?: string;
};

export type CompanyThemeCustomizerPanel = {
  id: string;
  label: string;
  description?: string;
  page: string;
  order: number;
};

export type CompanyThemeCustomizerPage = {
  path: string;
  label: string;
};

export type CompanyThemeCustomizerSchema = {
  slug: string;
  name: string;
  pages: CompanyThemeCustomizerPage[];
  panels: CompanyThemeCustomizerPanel[];
  fields: CompanyThemeCustomizerField[];
};

export const CRIMSON_CONSULTING_CUSTOMIZER: CompanyThemeCustomizerSchema = {
  slug: "crimson-consulting",
  name: "Crimson Consulting",
  pages: [
    { path: "/", label: "Home" },
    { path: "/about-us", label: "About Us" },
    { path: "/careers", label: "Careers" },
    { path: "/contact-us", label: "Contact Us" },
    { path: "/services/consulting", label: "Consulting" },
    { path: "/services/background-checks", label: "Background Checks" },
  ],
  panels: CRIMSON_PANELS,
  fields: CRIMSON_FIELDS,
};

const SCHEMA_BY_SLUG: Record<string, CompanyThemeCustomizerSchema> = {
  "crimson-consulting": CRIMSON_CONSULTING_CUSTOMIZER,
};

export function getCompanyThemeCustomizerSchema(slug: string | null | undefined): CompanyThemeCustomizerSchema | null {
  const s = (slug ?? "").trim();
  return SCHEMA_BY_SLUG[s] ?? null;
}

export function getDefaultCustomizerValues(schema: CompanyThemeCustomizerSchema): Record<string, string> {
  return Object.fromEntries(schema.fields.map((f) => [f.id, f.defaultValue]));
}

export function fieldAppliesToPage(field: CompanyThemeCustomizerField, pagePath: string): boolean {
  if (field.page === GLOBAL_PAGE) return true;
  return field.page === pagePath;
}

export function listCustomizerPanels(schema: CompanyThemeCustomizerSchema, page: string): CompanyThemeCustomizerPanel[] {
  return schema.panels
    .filter((panel) => panel.page === GLOBAL_PAGE || panel.page === page)
    .sort((a, b) => a.order - b.order);
}

export function listFieldsForPanel(
  schema: CompanyThemeCustomizerSchema,
  panelId: string,
  page: string,
): CompanyThemeCustomizerField[] {
  return schema.fields.filter((field) => {
    if (field.panelId !== panelId) return false;
    if (field.page === GLOBAL_PAGE) return true;
    return field.page === page;
  });
}

/** @deprecated Use listCustomizerPanels */
export function listCustomizerSections(schema: CompanyThemeCustomizerSchema, page: string): string[] {
  return listCustomizerPanels(schema, page).map((p) => p.label);
}
