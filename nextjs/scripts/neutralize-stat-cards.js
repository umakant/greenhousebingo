/* eslint-disable no-console */
/** Strip colored gradients from dashboard KPI stat blocks only. */
const fs = require("fs");
const path = require("path");

const TARGETS = [
  "src/components/superadmin-dashboard.tsx",
  "src/components/partnerships/partnerships-overview.tsx",
  "src/components/support-ticket/st-dashboard.tsx",
  "src/components/pos-dashboard.tsx",
  "src/components/account-dashboard.tsx",
  "src/components/ownership/brands-admin.tsx",
  "src/components/ownership/ownership-partners-admin.tsx",
  "src/components/ownership/ownership-requests-admin.tsx",
  "src/components/partnerships/partner-applications.tsx",
  "src/components/lms/lms-dashboard.tsx",
  "src/components/project-dashboard.tsx",
  "src/components/affiliate-business/affiliate-business-dashboard-client.tsx",
  "src/components/appointment/appointment-dashboard.tsx",
  "src/components/expense-management/em-dashboard-client.tsx",
  "src/components/hrm-dashboard.tsx",
  "src/components/storefront/storefront-dashboard.tsx",
  "src/components/recruitment/recruitment-dashboard.tsx",
  "src/components/marketplace/admin/marketplace-reports.tsx",
  "src/components/partner/partner-dashboard.tsx",
  "src/components/partner/partner-commission.tsx",
  "src/components/partner/partner-marketplace-revenue.tsx",
  "src/components/partner/partner-marketplace-commissions.tsx",
  "src/components/partner/partner-marketplace-referrals.tsx",
  "src/components/partnerships/partner-detail.tsx",
  "src/components/lms/lms-instructor-home-client.tsx",
];

const root = path.join(__dirname, "..");

const patterns = [
  [/bg-gradient-to-r\s+from-[\w-]+(?:\/[\d]+)?\s+to-[\w-]+(?:\/[\d]+)?/g, ""],
  [
    /border-(?:blue|green|emerald|purple|orange|amber|cyan|indigo|rose|violet|sky|teal|fuchsia|pink|red|yellow|lime|slate)-(?:\d+|800)(?:\/[\d]+)?/g,
    "",
  ],
  [/className="bg-gradient-to-br[^"]*"/g, ""],
  [/cardClass="[^"]*"/g, "cardClass=\"\""],
  [/cardClass:\s*"[^"]*"/g, "cardClass: \"\""],
  [/cardClass:\s*\n\s*"[^"]*"/g, "cardClass: \"\""],
  [/textClass="text-[^"]*"/g, "textClass=\"\""],
  [/textClass:\s*"text-[^"]*"/g, "textClass: \"\""],
  [/subClass="text-[^"]*"/g, "subClass=\"text-muted-foreground\""],
  [/subClass:\s*"text-[^"]*"/g, "subClass: \"text-muted-foreground\""],
  [/titleClass="text-[^"]*"/g, "titleClass=\"\""],
  [/valueClass="text-[^"]*"/g, "valueClass=\"\""],
  [/toneClass="text-[^"]*"/g, "toneClass=\"\""],
  [/className="[^"]*bg-gradient[^"]*"/g, ""],
  [/className={`[^`]*bg-gradient[^`]*`}/g, ""],
];

let changed = 0;
for (const rel of TARGETS) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.warn("skip missing", rel);
    continue;
  }
  let c = fs.readFileSync(file, "utf8");
  const orig = c;
  for (const [re, rep] of patterns) c = c.replace(re, rep);
  // collapse empty className on StatCard cards only
  c = c.replace(/className="\s+"/g, "");
  c = c.replace(/className="\s*"/g, "");
  if (c !== orig) {
    fs.writeFileSync(file, c);
    changed++;
    console.log("updated", rel);
  }
}
console.log("files changed:", changed);
