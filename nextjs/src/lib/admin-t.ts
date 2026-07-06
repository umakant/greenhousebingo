import { toTitleCaseUi } from "@/lib/to-title-case";

/**
 * Title-case admin UI copy (English admin surfaces). Use for labels, nav titles,
 * and section headings when strings are not loaded from locale JSON.
 */
export function t(text: string): string {
  return toTitleCaseUi(text);
}
