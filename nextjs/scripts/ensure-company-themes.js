/* eslint-disable no-console */
/**
 * Installs bundled Next.js company website themes (static HTML export).
 * Usage: node scripts/ensure-company-themes.js
 *
 * Default zip: ../crimsonglobal.cc/crimson-consulting-nextjs-template.zip
 * Override: COMPANY_THEME_CRIMSON_ZIP=/path/to/theme.zip
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const PUBLIC_THEMES = path.join(ROOT, "public", "company-themes");

const THEMES = [
  {
    slug: "crimson-consulting",
    name: "Crimson Consulting",
    description:
      "Professional security & consulting marketing site (Next.js static HTML theme). Includes home, about, careers, contact, and service pages.",
    zipCandidates: [
      process.env.COMPANY_THEME_CRIMSON_ZIP,
      path.join(ROOT, "..", "..", "crimsonglobal.cc", "crimson-consulting-nextjs-template.zip"),
      path.join(ROOT, "storage", "crimson-consulting-nextjs-template.zip"),
    ].filter(Boolean),
    zipDestName: "crimson-consulting-nextjs-template.zip",
  },
];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function resolveZip(candidates) {
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function extractZip(zipPath, destDir) {
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });
  if (process.platform === "win32") {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force"`,
      { stdio: "inherit" },
    );
  } else {
    execSync(`unzip -q -o "${zipPath}" -d "${destDir}"`, { stdio: "inherit" });
  }
}

function main() {
  console.log("Installing company Next.js themes...");
  fs.mkdirSync(PUBLIC_THEMES, { recursive: true });

  for (const theme of THEMES) {
    const zipPath = resolveZip(theme.zipCandidates);
    if (!zipPath) {
      console.warn(`  SKIP ${theme.slug}: zip not found. Set COMPANY_THEME_CRIMSON_ZIP or place zip at crimsonglobal.cc/.`);
      continue;
    }

    const tempDir = path.join(ROOT, "storage", `_install-${theme.slug}`);
    extractZip(zipPath, tempDir);

    const publicSrc = path.join(tempDir, "public");
    if (!fs.existsSync(publicSrc)) {
      console.warn(`  SKIP ${theme.slug}: no public/ folder in zip.`);
      fs.rmSync(tempDir, { recursive: true, force: true });
      continue;
    }

    const destPublic = path.join(PUBLIC_THEMES, theme.slug);
    fs.rmSync(destPublic, { recursive: true, force: true });
    copyDir(publicSrc, destPublic);

    fs.copyFileSync(zipPath, path.join(PUBLIC_THEMES, theme.zipDestName));

    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`  OK ${theme.name} → public/company-themes/${theme.slug}/`);
  }

  console.log("Done.");
}

main();
