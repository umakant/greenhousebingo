/**
 * Neutralize colored tint props on marketplace admin StatCard usages.
 */
const fs = require("fs");
const path = require("path");

const files = [
  "src/components/marketplace/admin/vendors-admin.tsx",
  "src/components/marketplace/admin/orders-admin.tsx",
  "src/components/marketplace/admin/delivery-queues-admin.tsx",
  "src/components/marketplace/admin/delivery-events-admin.tsx",
  "src/components/marketplace/admin/delivery-city-queue-admin.tsx",
  "src/components/marketplace/vendor/vendor-dashboard.tsx",
];

const root = path.join(__dirname, "..");

for (const rel of files) {
  const file = path.join(root, rel);
  let content = fs.readFileSync(file, "utf8");

  // Remove tint prop lines
  content = content.replace(/\n\s*tint="[^"]*"/g, "");

  // Neutralize icon colors in stat blocks
  content = content.replace(
    /className="h-5 w-5 text-[a-z]+-\d+"/g,
    'className="h-5 w-5 text-muted-foreground"',
  );
  content = content.replace(
    /tint="bg-[a-z]+-100 text-[a-z]+-\d+ dark:bg-[a-z]+-950 dark:text-[a-z]+-\d+"/g,
    "",
  );
  content = content.replace(
    /tint="bg-[a-z]+-100 text-[a-z]+-\d+ dark:bg-[a-z]+-950\/50 dark:text-[a-z]+-\d+"/g,
    "",
  );

  // Add import if StatCard uses tint and import missing
  if (
    content.includes("function StatCard") &&
    !content.includes("DASHBOARD_STAT_ICON_TINT")
  ) {
    const importLine =
      'import { DASHBOARD_STAT_ICON_TINT } from "@/components/dashboard/dashboard-stat-styles";';
    if (content.includes('"use client"')) {
      content = content.replace('"use client";\n', `"use client";\n\n${importLine}\n`);
    } else {
      content = importLine + "\n" + content;
    }

    content = content.replace(
      /tint,\n(\s*)\}: \{\n([\s\S]*?)tint: string;/,
      "tint = DASHBOARD_STAT_ICON_TINT,\n$1}: {\n$2tint?: string;",
    );
    content = content.replace(
      /tint: string;\n(\s*)\}\) =>/,
      "tint?: string;\n$1}) =>",
    );
  }

  fs.writeFileSync(file, content);
  console.log("Updated", rel);
}
