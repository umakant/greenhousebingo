/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const files = [
  "src/components/superadmin-dashboard.tsx",
  "src/components/partnerships/partnerships-overview.tsx",
  "src/components/hrm-dashboard.tsx",
  "src/components/expense-management/em-dashboard-client.tsx",
  "src/components/storefront/storefront-dashboard.tsx",
  "src/components/recruitment/recruitment-dashboard.tsx",
  "src/components/appointment/appointment-dashboard.tsx",
];

const root = path.join(__dirname, "..");

for (const rel of files) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  let c = fs.readFileSync(file, "utf8");
  const orig = c;
  c = c.replace(/\n\s*className="[^"]*dark:from[^"]*"/g, "");
  c = c.replace(/\n\s*className="[^"]*dark:to[^"]*"/g, "");
  c = c.replace(/\n\s*titleClass=""/g, "");
  c = c.replace(/\n\s*valueClass=""/g, "");
  c = c.replace(/\n\s*subClass="text-muted-foreground"/g, "");
  c = c.replace(/className="h-full cursor-pointer\s+transition-shadow hover:shadow-md hover:opacity-95 dark:[^"]*"/g,
    "className=\"h-full cursor-pointer transition-shadow hover:shadow-md hover:opacity-95\"");
  c = c.replace(/className="relative h-full cursor-pointer overflow-hidden\s+transition-shadow hover:shadow-md dark:[^"]*"/g,
    "className=\"relative h-full cursor-pointer overflow-hidden transition-shadow hover:shadow-md\"");
  c = c.replace(/"\s+dark:\s+dark:from-[^"]+"/g, "\"\"");
  c = c.replace(/card: "\s*",/g, "card: \"\",");
  c = c.replace(/text: "text-[^"]+",/g, "text: \"\",");
  c = c.replace(/sub: "text-[^"]+",/g, "sub: \"text-muted-foreground\",");
  if (c !== orig) {
    fs.writeFileSync(file, c);
    console.log("cleaned", rel);
  }
}
