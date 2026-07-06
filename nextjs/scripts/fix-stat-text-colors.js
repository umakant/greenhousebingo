/* eslint-disable no-console */
const fs = require("fs");
const files = [
  "src/components/hrm-dashboard.tsx",
  "src/components/expense-management/em-dashboard-client.tsx",
  "src/components/storefront/storefront-dashboard.tsx",
  "src/components/recruitment/recruitment-dashboard.tsx",
  "src/components/account-dashboard.tsx",
  "src/components/partnerships/partner-applications.tsx",
  "src/components/pos-dashboard.tsx",
  "src/components/support-ticket/st-dashboard.tsx",
  "src/components/lms/lms-dashboard.tsx",
  "src/components/project-dashboard.tsx",
  "src/components/affiliate-business/affiliate-business-dashboard-client.tsx",
  "src/components/lms/lms-instructor-home-client.tsx",
];
const textColorRe =
  /text-(?:blue|green|emerald|purple|orange|amber|cyan|indigo|rose|violet|sky|teal|fuchsia|pink|red|yellow)-(?:\d+|800)(?:\/[\d]+)?(?:\s+dark:text-[\w-]+(?:\/[\d]+)?)?/g;

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let c = fs.readFileSync(f, "utf8");
  const o = c;
  c = c.replace(textColorRe, "text-muted-foreground");
  c = c.replace(/\n\s*textClass=""/g, "");
  c = c.replace(/\n\s*subClass="text-muted-foreground"/g, "");
  c = c.replace(/\n\s*cardClass=""/g, "");
  c = c.replace(/cardClass: "",/g, "");
  c = c.replace(/textClass: "",/g, "");
  c = c.replace(/subClass: "text-muted-foreground",/g, "");
  c = c.replace(/className="  dark:[^"]+"/g, "");
  c = c.replace(/\n\s*textClass=\{card\.textClass\}/g, "");
  c = c.replace(/\n\s*subClass=\{card\.subClass\}/g, "");
  c = c.replace(/\n\s*className=\{card\.cardClass\}/g, "");
  if (c !== o) {
    fs.writeFileSync(f, c);
    console.log("fixed", f);
  }
}
