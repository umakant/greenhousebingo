/* eslint-disable no-console */
/**
 * Installs bundled company website themes.
 * Usage: node scripts/ensure-company-themes.js
 *
 * Plant Bingo Bash zip (default):
 *   storage/plant-bingo-bash.zip
 * Override: COMPANY_THEME_PLANT_BINGO_ZIP=/path/to/Plant Bingo Bash.zip
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { main: buildPlantBingoBash, THEME_SLUG } = require("./build-plant-bingo-bash-theme");

const ROOT = path.join(__dirname, "..");
const PUBLIC_THEMES = path.join(ROOT, "public", "company-themes");

const ZIP_CANDIDATES = [
  process.env.COMPANY_THEME_PLANT_BINGO_ZIP,
  path.join(ROOT, "storage", "plant-bingo-bash.zip"),
  path.join(ROOT, "..", "..", "green house bingo", "Plant Bingo Bash.zip"),
].filter(Boolean);

function resolveZip(candidates) {
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function extractZip(zipPath, destDir) {
  if (fs.existsSync(destDir)) {
    console.log(`  Reusing existing extract at ${path.relative(ROOT, destDir)}`);
    return;
  }
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

function removeLegacyThemes() {
  for (const legacy of ["crimson-consulting", "win-with-barlow-securx"]) {
    const legacyDir = path.join(PUBLIC_THEMES, legacy);
    if (fs.existsSync(legacyDir)) {
      fs.rmSync(legacyDir, { recursive: true, force: true });
      console.log(`  Removed legacy theme public/company-themes/${legacy}/`);
    }
  }
}

async function run() {
  console.log("Installing company website themes...");
  fs.mkdirSync(PUBLIC_THEMES, { recursive: true });

  const zipPath = resolveZip(ZIP_CANDIDATES);
  if (!zipPath) {
    console.warn(
      "  SKIP plant-bingo-bash: zip not found. Place Plant Bingo Bash.zip at storage/plant-bingo-bash.zip",
    );
    return;
  }

  const storageZip = path.join(ROOT, "storage", "plant-bingo-bash.zip");
  if (path.resolve(zipPath) !== path.resolve(storageZip)) {
    fs.copyFileSync(zipPath, storageZip);
    console.log(`  Copied zip → storage/plant-bingo-bash.zip`);
  }

  const tempDir = path.join(ROOT, "storage", `_install-${THEME_SLUG}`);
  extractZip(storageZip, tempDir);

  removeLegacyThemes();
  await buildPlantBingoBash(tempDir);

  fs.copyFileSync(storageZip, path.join(PUBLIC_THEMES, "plant-bingo-bash.zip"));
  console.log("Done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
