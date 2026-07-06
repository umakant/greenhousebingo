const fs = require("fs");
const path = require("path");

const files = [
  "src/components/marketplace/admin/vendors-admin.tsx",
  "src/components/marketplace/admin/orders-admin.tsx",
  "src/components/marketplace/admin/delivery-queues-admin.tsx",
  "src/components/marketplace/admin/delivery-events-admin.tsx",
  "src/components/marketplace/admin/delivery-city-queue-admin.tsx",
];

const root = path.join(__dirname, "..");
const importLine =
  'import { DASHBOARD_STAT_ICON_TINT } from "@/components/dashboard/dashboard-stat-styles";';

for (const rel of files) {
  const file = path.join(root, rel);
  let content = fs.readFileSync(file, "utf8");

  if (!content.includes("DASHBOARD_STAT_ICON_TINT")) {
    content = content.replace('"use client";\n', `"use client";\n\n${importLine}\n`);
  }

  content = content.replace(
    /tint,\n(\s*)\}: \{\n([\s\S]*?)tint: string;\n/g,
    "tint = DASHBOARD_STAT_ICON_TINT,\n$1}: {\n$2tint?: string;\n",
  );

  content = content.replace(
    /tint: string;\n(\s*)\}\) => \{/g,
    "tint?: string;\n$1}) => {",
  );

  // delivery-events has MiniStatCard with tint in different shape
  content = content.replace(
    /tint,\n(\s*)\}: \{\n([\s\S]*?)tint: string;\n(\s*)\}\) \{/g,
    "tint = DASHBOARD_STAT_ICON_TINT,\n$1}: {\n$2tint?: string;\n$3}) {",
  );

  fs.writeFileSync(file, content);
  console.log("Fixed", rel);
}
