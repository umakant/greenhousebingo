/**
 * Title-case UI strings for English: each letter-run (including simple
 * apostrophe forms like `don't` → `Don't`) gets a leading capital and the
 * rest lowercased. Slash- and space-separated words are handled naturally.
 * Does not alter digits or punctuation-only segments.
 */
export function toTitleCaseUi(input: string): string {
  if (!input) return input;
  if (/\{[^}]+\}/.test(input)) {
    return input
      .split(/(\{[^}]+\})/g)
      .map((chunk) => {
        if (/^\{[^}]+\}$/.test(chunk)) return chunk;
        return chunk.replace(/[A-Za-z]+(?:'[A-Za-z]+)*/g, (word) => titleCaseWord(word));
      })
      .join("");
  }
  return input.replace(/[A-Za-z]+(?:'[A-Za-z]+)*/g, (word) => titleCaseWord(word));
}

/** Preserve acronyms (HRM, CRM, LMS, POS, …) when English title-case runs on UI strings. */
function isPreservedAcronym(word: string): boolean {
  return /^[A-Z]{2,}$/.test(word);
}

function titleCaseWord(word: string): string {
  if (isPreservedAcronym(word)) return word;
  const parts = word.split("'");
  if (parts.length === 2) {
    const [a, b] = parts;
    if (a && b && a.length >= 2 && b.length <= 2) {
      return a.charAt(0).toUpperCase() + a.slice(1).toLowerCase() + "'" + b.toLowerCase();
    }
  }
  return parts.map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : "")).join("'");
}
