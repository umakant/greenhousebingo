import {
  INDUSTRY_MODULE_CATEGORIES,
  normalizeIndustryModuleName,
} from "@/lib/industry-modules-catalog";
import {
  OTHER_MODULE_CATEGORY_ID,
  enrichModuleWithCatalog,
  type ModuleCodeRow,
} from "@/lib/industry-module-codes";

export type EnrichedModule = ModuleCodeRow & {
  id: string;
  categoryId: string;
  categoryTitle: string;
  categoryCode: string;
  moduleCode: string;
};

export function enrichModulesForSelect(modules: Array<ModuleCodeRow & { id: string }>): EnrichedModule[] {
  return modules.map((m) => enrichModuleWithCatalog(m));
}

export function modulesForCategory(modules: EnrichedModule[], categoryId: string): EnrichedModule[] {
  return modules
    .filter((m) => m.categoryId === categoryId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function moduleCategoryOptions(modules: EnrichedModule[]) {
  const options = INDUSTRY_MODULE_CATEGORIES.map((c) => ({
    id: c.id,
    title: c.title,
  }));

  const hasOther = modules.some((m) => m.categoryId === OTHER_MODULE_CATEGORY_ID);
  if (hasOther) {
    options.push({ id: OTHER_MODULE_CATEGORY_ID, title: "Other Modules" });
  }

  return options.filter((opt) => modules.some((m) => m.categoryId === opt.id));
}

export function findEnrichedModule(modules: EnrichedModule[], moduleId: string): EnrichedModule | null {
  return modules.find((m) => m.id === moduleId) ?? null;
}

export function inferCategoryIdForModuleId(modules: EnrichedModule[], moduleId: string): string {
  return findEnrichedModule(modules, moduleId)?.categoryId ?? INDUSTRY_MODULE_CATEGORIES[0]?.id ?? "";
}

export function catalogSubcategoryNames(categoryId: string): string[] {
  if (categoryId === OTHER_MODULE_CATEGORY_ID) return [];
  const category = INDUSTRY_MODULE_CATEGORIES.find((c) => c.id === categoryId);
  return category?.moduleNames ?? [];
}

export function isCatalogSubcategoryName(categoryId: string, name: string): boolean {
  const key = normalizeIndustryModuleName(name);
  return catalogSubcategoryNames(categoryId).some((n) => normalizeIndustryModuleName(n) === key);
}
