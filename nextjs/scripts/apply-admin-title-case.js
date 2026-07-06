/* eslint-disable no-console */
/**
 * Replace identity `const t = (s: string) => s` stubs with shared admin title-case helper.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "src");
const STUB = "const t = (s: string) => s;";
const IMPORT = 'import { t } from "@/lib/admin-t";';

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(full);
  }
  return out;
}

function insertImport(content) {
  if (content.includes(IMPORT) || content.includes('from "@/lib/admin-t"')) return content;
  const lines = content.split(/\r?\n/);
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import .+ from .+;?\s*$/.test(lines[i])) lastImport = i;
  }
  if (lastImport >= 0) {
    lines.splice(lastImport + 1, 0, IMPORT);
    return lines.join("\n");
  }
  return `${IMPORT}\n${content}`;
}

let changed = 0;
for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, "utf8");
  if (!content.includes(STUB)) continue;
  content = content.replace(new RegExp(`\\r?\\n${STUB.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\r?\\n`, "g"), "\n");
  content = insertImport(content);
  fs.writeFileSync(file, content);
  changed += 1;
  console.log("updated", path.relative(path.join(__dirname, ".."), file));
}

console.log(`Done. Updated ${changed} files.`);
