import {
  INDUSTRY_MODULE_CATEGORIES,
  normalizeIndustryModuleName,
  type IndustryCatalogCategory,
} from "@/lib/industry-modules-catalog";

export const OTHER_MODULE_CATEGORY_ID = "other-modules";

const SEQUENTIAL_CODE_RE = /^(.+?) (\d{2,})$/;

export type ModuleCodeRow = { name: string; code?: string | null };

export function findCategoryById(categoryId: string): IndustryCatalogCategory | null {
  return INDUSTRY_MODULE_CATEGORIES.find((c) => c.id === categoryId) ?? null;
}

export function findCategoryForModuleName(moduleName: string): IndustryCatalogCategory | null {
  const key = normalizeIndustryModuleName(moduleName);
  if (!key) return null;
  for (const category of INDUSTRY_MODULE_CATEGORIES) {
    if (category.moduleNames.some((n) => normalizeIndustryModuleName(n) === key)) {
      return category;
    }
  }
  return null;
}

export function categoryIndexInCatalog(categoryId: string): number {
  const idx = INDUSTRY_MODULE_CATEGORIES.findIndex((c) => c.id === categoryId);
  if (idx >= 0) return idx + 1;
  return INDUSTRY_MODULE_CATEGORIES.length + 1;
}

/** e.g. "Health Services 01" — one sequential slot per catalog category title */
export function buildCategoryCode(categoryTitle: string, _categoryId?: string): string {
  return `${categoryTitle.trim()} 01`;
}

function parseSequentialSuffix(code: string | null | undefined): { label: string; sequence: number } | null {
  const trimmed = (code ?? "").trim();
  if (!trimmed) return null;
  const match = SEQUENTIAL_CODE_RE.exec(trimmed);
  if (!match) return null;
  const sequence = Number(match[2]);
  if (!Number.isFinite(sequence) || sequence < 1) return null;
  return { label: match[1].trim(), sequence };
}

/** Next sequence for a module name within a category (e.g. DNA Testing → 02). */
export function nextModuleSequence(
  moduleName: string,
  categoryId: string,
  existingModules: ModuleCodeRow[],
): number {
  const targetName = normalizeIndustryModuleName(moduleName);
  if (!targetName) return 1;

  const category = findCategoryById(categoryId);
  const categoryNames = new Set(
    (category?.moduleNames ?? []).map((n) => normalizeIndustryModuleName(n)),
  );
  const inCategory = (name: string) => {
    if (categoryId === OTHER_MODULE_CATEGORY_ID) {
      return findCategoryForModuleName(name) == null;
    }
    return categoryNames.has(normalizeIndustryModuleName(name));
  };

  let max = 0;
  for (const row of existingModules) {
    if (normalizeIndustryModuleName(row.name) !== targetName) continue;
    if (!inCategory(row.name)) continue;

    const parsed = parseSequentialSuffix(row.code);
    if (parsed && normalizeIndustryModuleName(parsed.label) === targetName) {
      max = Math.max(max, parsed.sequence);
      continue;
    }
    max = Math.max(max, 1);
  }

  return max + 1;
}

/** e.g. "DNA Testing 01" */
export function buildModuleCode(moduleName: string, sequence: number): string {
  const label = moduleName.trim();
  return `${label} ${String(sequence).padStart(2, "0")}`;
}

export function resolveModuleCategoryId(moduleName: string): string {
  return findCategoryForModuleName(moduleName)?.id ?? OTHER_MODULE_CATEGORY_ID;
}

export function resolveCategoryTitle(categoryId: string): string {
  if (categoryId === OTHER_MODULE_CATEGORY_ID) return "Other Modules";
  return findCategoryById(categoryId)?.title ?? "Other Modules";
}

export function enrichModuleWithCatalog<T extends ModuleCodeRow>(
  module: T,
  categoryId?: string,
): T & {
  categoryId: string;
  categoryTitle: string;
  categoryCode: string;
  moduleCode: string;
} {
  const resolvedCategoryId = categoryId ?? resolveModuleCategoryId(module.name);
  const categoryTitle = resolveCategoryTitle(resolvedCategoryId);
  const categoryCode = buildCategoryCode(categoryTitle, resolvedCategoryId);
  const parsed = parseSequentialSuffix(module.code);
  const moduleCode =
    parsed && normalizeIndustryModuleName(parsed.label) === normalizeIndustryModuleName(module.name)
      ? module.code!.trim()
      : buildModuleCode(module.name, 1);

  return {
    ...module,
    categoryId: resolvedCategoryId,
    categoryTitle,
    categoryCode,
    moduleCode,
  };
}

export function previewNextModuleCode(
  moduleName: string,
  categoryId: string,
  existingModules: ModuleCodeRow[],
): { categoryCode: string; moduleCode: string } {
  const categoryTitle = resolveCategoryTitle(categoryId);
  const categoryCode = buildCategoryCode(categoryTitle, categoryId);
  const sequence = nextModuleSequence(moduleName, categoryId, existingModules);
  const moduleCode = buildModuleCode(moduleName, sequence);
  return { categoryCode, moduleCode };
}
