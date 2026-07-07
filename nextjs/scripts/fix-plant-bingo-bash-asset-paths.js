/* eslint-disable no-console */
/**
 * One-time / maintenance fix: bake absolute /company-themes/.../assets/ URLs into
 * prerendered Plant Bingo Bash HTML so CSS and images load under /sites/{slug}.
 */
const fs = require("fs");
const path = require("path");

const THEME_DIR = path.join(__dirname, "..", "public", "company-themes", "plant-bingo-bash");
const ASSET_PREFIX = "/company-themes/plant-bingo-bash";

function fixHtml(html) {
  let out = html;
  out = out.replace(/(?:href|src)=["']assets\//gi, (m) => m.replace("assets/", `${ASSET_PREFIX}/assets/`));
  out = out.replace(/(?:href|src)=["']\/assets\//gi, (m) => m.replace("/assets/", `${ASSET_PREFIX}/assets/`));
  out = out.replace(/url\(\s*(['"]?)assets\//gi, `url($1${ASSET_PREFIX}/assets/`);
  out = out.replace(/url\(\s*(['"]?)\/assets\//gi, `url($1${ASSET_PREFIX}/assets/`);
  return out;
}

function walk(dir) {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += walk(full);
    } else if (entry.name.endsWith(".html")) {
      const raw = fs.readFileSync(full, "utf8");
      const fixed = fixHtml(raw);
      if (fixed !== raw) {
        fs.writeFileSync(full, fixed, "utf8");
        count += 1;
        console.log(`  fixed ${path.relative(THEME_DIR, full)}`);
      }
    }
  }
  return count;
}

if (!fs.existsSync(THEME_DIR)) {
  console.error(`Theme directory not found: ${THEME_DIR}`);
  process.exit(1);
}

const updated = walk(THEME_DIR);
console.log(`Done. Updated ${updated} HTML file(s).`);
