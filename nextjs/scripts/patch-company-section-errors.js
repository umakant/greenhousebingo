const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "src", "components", "companies");
const files = fs
  .readdirSync(dir)
  .filter((f) => f.startsWith("company-") && f.endsWith("-section.tsx") && f !== "company-login-activity-section.tsx");

for (const file of files) {
  const filePath = path.join(dir, file);
  let src = fs.readFileSync(filePath, "utf8");
  if (src.includes("CompanySectionError")) continue;

  if (!src.includes('const [loading, setLoading]')) continue;

  src = src.replace(
    /import \* as React from "react";\n/,
    'import * as React from "react";\n\nimport { CompanySectionError } from "@/components/companies/company-section-error";\n',
  );

  src = src.replace(
    /const \[loading, setLoading\] = React\.useState\(true\);/,
    'const [loading, setLoading] = React.useState(true);\n  const [loadError, setLoadError] = React.useState<string | null>(null);',
  );

  src = src.replace(
    /if \(!res\.ok\) throw new Error\(([^)]+)\);\n(\s+)setRows\(/g,
    "if (!res.ok) throw new Error($1);\n$2setLoadError(null);\n$2setRows(",
  );

  src = src.replace(
    /if \(!res\.ok\) throw new Error\(([^)]+)\);\n(\s+)setProjects\(/g,
    "if (!res.ok) throw new Error($1);\n$2setLoadError(null);\n$2setProjects(",
  );

  src = src.replace(
    /} catch \(e: unknown\) \{\n(\s+)console\.error\(e\);\n(\s+)setRows\(\[\]\);/g,
    "} catch (e: unknown) {\n$1console.error(e);\n$1setLoadError(e instanceof Error ? e.message : \"Failed to load data\");\n$2setRows([]);",
  );

  src = src.replace(
    /} catch \(e: unknown\) \{\n(\s+)console\.error\(e\);\n(\s+)\} finally \{\n(\s+)setLoadingProjects\(false\);/g,
    "} catch (e: unknown) {\n$1console.error(e);\n$1setLoadError(e instanceof Error ? e.message : \"Failed to load data\");\n$2} finally {\n$3setLoadingProjects(false);",
  );

  if (src.includes('<div className="overflow-x-auto">')) {
    src = src.replace(
      '<div className="overflow-x-auto">',
      '<CompanySectionError message={loadError} />\n        <div className="overflow-x-auto">',
    );
  }

  fs.writeFileSync(filePath, src);
  console.log("patched", file);
}
