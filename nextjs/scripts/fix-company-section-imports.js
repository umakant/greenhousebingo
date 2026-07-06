const fs = require("fs");
const path = require("path");

const files = [
  "company-contacts-section.tsx",
  "company-credit-notes-section.tsx",
  "company-documents-section.tsx",
  "company-estimates-section.tsx",
  "company-invoices-section.tsx",
  "company-payments-section.tsx",
];

const dir = path.join(__dirname, "..", "src", "components", "companies");

for (const file of files) {
  const filePath = path.join(dir, file);
  let src = fs.readFileSync(filePath, "utf8");
  let changed = false;

  if (!src.includes('from "@/components/companies/company-section-error"')) {
    src = src.replace(
      /import \* as React from "react";\n/,
      'import * as React from "react";\n\nimport { CompanySectionError } from "@/components/companies/company-section-error";\n',
    );
    changed = true;
  }

  if (!src.includes("setLoadError(null)") && src.includes("setLoadError")) {
    src = src.replace(
      /if \(!res\.ok\) throw new Error\(([^)]+)\);\n(\s+)setRows\(/g,
      "if (!res.ok) throw new Error($1);\n$2setLoadError(null);\n$2setRows(",
    );
    src = src.replace(
      /} catch \(e: unknown\) \{\n(\s+)console\.error\(e\);\n(\s+)setRows\(\[\]\);/g,
      "} catch (e: unknown) {\n$1console.error(e);\n$1setLoadError(e instanceof Error ? e.message : \"Failed to load data\");\n$2setRows([]);",
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, src);
    console.log("fixed", file);
  }
}
