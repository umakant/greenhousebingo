/* eslint-disable no-console */
/**
 * Builds Plant Bingo Bash company website theme from the Lovable/TanStack zip.
 * Prerenders SSR HTML to static files under public/company-themes/plant-bingo-bash/.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const THEME_SLUG = "plant-bingo-bash";
const DEST_PUBLIC = path.join(ROOT, "public", "company-themes", THEME_SLUG);

const STATIC_ROUTES = [
  "/",
  "/about",
  "/account",
  "/buy-tickets",
  "/calendar",
  "/cities",
  "/community",
  "/contact",
  "/host-event",
  "/how-it-works",
  "/login",
  "/pricing",
  "/privacy",
  "/refund",
  "/start-business",
  "/states",
  "/terms",
  "/events",
  "/partner/dashboard",
  "/venue/dashboard",
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

function patchLogoImports(themeDir) {
  const navPath = path.join(themeDir, "src", "components", "site-nav.tsx");
  const footerPath = path.join(themeDir, "src", "components", "site-footer.tsx");

  let nav = fs.readFileSync(navPath, "utf8");
  nav = nav.replace(
    /import logoAsset from "@\/assets\/social-greenhouse-light\.png\.asset\.json";/,
    'import logoUrl from "@/assets/the-social-greenhouse-logo.png";',
  );
  nav = nav.replace(/logoAsset\.url/g, "logoUrl");
  fs.writeFileSync(navPath, nav);

  let footer = fs.readFileSync(footerPath, "utf8");
  footer = footer.replace(
    /import logoAsset from "@\/assets\/social-greenhouse-dark\.png\.asset\.json";\s*\nimport poweredByAsset from "@\/assets\/PB_GreenhouseBingo_dark\.png\.asset\.json";/,
    'import brandLogoUrl from "@/assets/social-greenhouse-dark.png";\nimport poweredByLogoUrl from "@/assets/PB_GreenhouseBingo_dark.png";',
  );
  footer = footer.replace(/logoAsset\.url/g, "brandLogoUrl");
  footer = footer.replace(/poweredByAsset\.url/g, "poweredByLogoUrl");
  fs.writeFileSync(footerPath, footer);
}

function readEventSlugs(themeDir) {
  const eventsPath = path.join(themeDir, "src", "lib", "events-data.ts");
  const source = fs.readFileSync(eventsPath, "utf8");
  const slugs = [];
  for (const match of source.matchAll(/slug:\s*"([^"]+)"/g)) slugs.push(match[1]);
  return [...new Set(slugs)];
}

function routeToRelativeFile(route) {
  if (route === "/") return "index.html";
  const trimmed = route.replace(/^\//, "");
  return `${trimmed}/index.html`;
}

function normalizePrerenderedHtml(html) {
  let out = html;
  out = out.replace(/<script\b[^>]*type=["']module["'][^>]*>[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi, "");
  out = out.replace(/(?:href|src)=["']\/assets\//gi, (m) => m.replace("/assets/", "assets/"));
  out = out.replace(/url\(\s*(['"]?)\/assets\//gi, "url($1assets/");
  out = out.replace(/\/__l5e\/assets-v1\/[^"']+/g, "assets/brand-logo.png");
  return out;
}

async function prerenderRoutes(themeDir, routes) {
  const ssrPath = path.join(themeDir, ".output", "server", "_ssr", "ssr.mjs");
  const mod = await import(pathToFileURL(ssrPath).href);
  const ssr = mod.default;

  const rendered = new Map();
  for (const route of routes) {
    const response = await ssr.fetch(new Request(`http://localhost${route}`));
    if (!response.ok && response.status !== 307) {
      console.warn(`  WARN prerender ${route}: HTTP ${response.status}`);
      continue;
    }
    if (response.status === 307) {
      const location = response.headers.get("location") || route;
      const redirected = location.startsWith("http") ? new URL(location).pathname : location;
      if (!rendered.has(redirected)) {
        const retry = await ssr.fetch(new Request(`http://localhost${redirected}`));
        if (retry.ok) {
          rendered.set(route, await retry.text());
          rendered.set(redirected, rendered.get(route));
        }
      }
      continue;
    }
    rendered.set(route, await response.text());
  }
  return rendered;
}

function pathToFileURL(filePath) {
  const resolved = path.resolve(filePath).replace(/\\/g, "/");
  return new URL(`file:///${resolved}`);
}

function writePrerenderedPages(rendered) {
  fs.rmSync(DEST_PUBLIC, { recursive: true, force: true });
  fs.mkdirSync(DEST_PUBLIC, { recursive: true });

  for (const [route, rawHtml] of rendered.entries()) {
    const html = normalizePrerenderedHtml(rawHtml);
    const relativeFile = routeToRelativeFile(route);
    const outPath = path.join(DEST_PUBLIC, relativeFile);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html, "utf8");
  }
}

function copyBuildAssets(themeDir) {
  const assetsSrc = path.join(themeDir, ".output", "public", "assets");
  const assetsDest = path.join(DEST_PUBLIC, "assets");
  copyDir(assetsSrc, assetsDest);

  const logoSrc = path.join(themeDir, "src", "assets", "the-social-greenhouse-logo.png");
  const logoFallback = path.join(themeDir, "src", "assets", "logo.png");
  const resolvedLogo = fs.existsSync(logoSrc) ? logoSrc : logoFallback;
  if (fs.existsSync(resolvedLogo)) {
    fs.copyFileSync(resolvedLogo, path.join(assetsDest, "brand-logo.png"));
  }

  const poweredBySrc = path.join(themeDir, "src", "assets", "greenhouse-bingo-powered-by.png");
  if (fs.existsSync(poweredBySrc)) {
    fs.copyFileSync(poweredBySrc, path.join(assetsDest, "greenhouse-bingo-powered-by.png"));
  }

  const footerBrandSrc = path.join(themeDir, "src", "assets", "social-greenhouse-dark.png");
  if (fs.existsSync(footerBrandSrc)) {
    fs.copyFileSync(footerBrandSrc, path.join(assetsDest, "the-social-greenhouse-logo-footer.png"));
  }

  const footerPoweredBySrc = path.join(themeDir, "src", "assets", "PB_GreenhouseBingo_dark.png");
  if (fs.existsSync(footerPoweredBySrc)) {
    fs.copyFileSync(footerPoweredBySrc, path.join(assetsDest, "greenhouse-bingo-powered-by.png"));
  }

  const faviconSrc = path.join(themeDir, ".output", "public", "favicon.ico");
  if (fs.existsSync(faviconSrc)) {
    fs.copyFileSync(faviconSrc, path.join(DEST_PUBLIC, "favicon.ico"));
  }

  const thumbnailCandidates = [
    path.join(ROOT, "storage", "plant-bingo-bash-theme-thumbnail.png"),
    path.join(themeDir, "theme-thumbnail.png"),
  ];
  const thumbnailDest = path.join(DEST_PUBLIC, "theme-thumbnail.png");
  for (const candidate of thumbnailCandidates) {
    if (fs.existsSync(candidate)) {
      fs.copyFileSync(candidate, thumbnailDest);
      break;
    }
  }
}

function buildHtmlRoutes(eventSlugs) {
  const routes = {};
  for (const route of STATIC_ROUTES) {
    routes[route] = routeToRelativeFile(route);
    if (route !== "/") routes[`${route}/`] = routeToRelativeFile(route);
  }
  for (const slug of eventSlugs) {
    const route = `/events/${slug}`;
    routes[route] = routeToRelativeFile(route);
    routes[`${route}/`] = routeToRelativeFile(route);
  }
  return routes;
}

function writeRoutesManifest(eventSlugs) {
  const manifest = {
    slug: THEME_SLUG,
    name: "Plant Bingo Bash",
    htmlRoutes: buildHtmlRoutes(eventSlugs),
  };
  fs.writeFileSync(
    path.join(DEST_PUBLIC, "theme-routes.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  const routesTsPath = path.join(ROOT, "src", "lib", "company-themes", "plant-bingo-bash-html-routes.ts");
  const routesBody = JSON.stringify(manifest.htmlRoutes, null, 2);
  fs.writeFileSync(
    routesTsPath,
    `/** Auto-generated by scripts/build-plant-bingo-bash-theme.js — do not edit by hand. */\nexport const PLANT_BINGO_BASH_HTML_ROUTES: Record<string, string> = ${routesBody};\n`,
    "utf8",
  );
}

async function main(themeDir) {
  console.log(`Building ${THEME_SLUG} from ${themeDir}...`);
  patchLogoImports(themeDir);

  console.log("  npm install...");
  execSync("npm install", { cwd: themeDir, stdio: "inherit" });

  console.log("  npm run build...");
  execSync("npm run build", { cwd: themeDir, stdio: "inherit" });

  const eventSlugs = readEventSlugs(themeDir);
  const routes = [...STATIC_ROUTES, ...eventSlugs.map((slug) => `/events/${slug}`)];

  console.log(`  Prerendering ${routes.length} routes...`);
  const rendered = await prerenderRoutes(themeDir, routes);
  writePrerenderedPages(rendered);
  copyBuildAssets(themeDir);
  writeRoutesManifest(eventSlugs);

  console.log(`  OK → public/company-themes/${THEME_SLUG}/ (${rendered.size} pages)`);
}

module.exports = { main, THEME_SLUG, buildHtmlRoutes, STATIC_ROUTES };

if (require.main === module) {
  const themeDir = process.argv[2] || path.join(ROOT, "storage", "_install-plant-bingo-bash");
  main(themeDir).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
