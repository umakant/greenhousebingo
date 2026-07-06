import "server-only";

import fs from "fs/promises";
import path from "path";

export type ParsedThemeStyleToken = {
  tokenKey: string;
  value: string;
  groupName: string;
};

// Extract inner CSS of the first top-level :root { ... } block (brace-balanced).
export function extractFirstRootBlock(css: string): string | null {
  const re = /:root\s*\{/g;
  const m = re.exec(css);
  if (!m || m.index === undefined) return null;
  let i = m.index + m[0].length;
  let depth = 1;
  const start = i;
  while (i < css.length && depth > 0) {
    const ch = css[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    i++;
  }
  if (depth !== 0) return null;
  return css.slice(start, i - 1);
}

// Parses CSS custom properties (--name: value) and section group comments (slash-star-bang ... star-slash) in :root. 
export function parseRootCssVariables(inner: string): ParsedThemeStyleToken[] {
  const out: ParsedThemeStyleToken[] = [];
  let group = "General";
  const lines = inner.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) continue;
    const sec = line.match(/^\/\*!\s*(.+?)\s*\*\/$/);
    if (sec) {
      group = sec[1].trim() || "General";
      continue;
    }
    const decl = line.match(/^--([\w-]+)\s*:\s*(.+?);?\s*$/);
    if (decl) {
      let val = decl[2].trim();
      if (val.endsWith(";")) val = val.slice(0, -1).trim();
      out.push({ tokenKey: decl[1], value: val, groupName: group });
    }
  }
  return out;
}

const HEAD_CSS_CANDIDATES = [
  "assets/styles/index-head.css",
  "assets/index.css",
  "assets/base.css",
];

export async function loadThemeCssVariableTokens(themeRoot: string): Promise<ParsedThemeStyleToken[]> {
  for (const rel of HEAD_CSS_CANDIDATES) {
    const abs = path.join(themeRoot, ...rel.split("/"));
    let css: string;
    try {
      css = await fs.readFile(abs, "utf8");
    } catch {
      continue;
    }
    const inner = extractFirstRootBlock(css);
    if (!inner) continue;
    const parsed = parseRootCssVariables(inner);
    if (parsed.length > 0) return parsed;
  }
  return [];
}
