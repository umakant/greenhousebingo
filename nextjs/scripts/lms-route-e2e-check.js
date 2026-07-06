/* eslint-disable no-console */
/**
 * E2E smoke: login as each demo account and hit LMS pages + key APIs.
 * Run: node scripts/lms-route-e2e-check.js
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const BASE = (process.env.LMS_E2E_BASE_URL || "http://localhost:5000").replace(/\/$/, "");

const ACCOUNTS = [
  { label: "company (admin)", email: "company@example.com", password: "1234" },
  { label: "staff (learner)", email: "staff@example.com", password: "1234" },
  { label: "hr (instructor)", email: "hr@example.com", password: "1234" },
  { label: "sales (learner 2)", email: "sales@example.com", password: "1234" },
  { label: "superadmin", email: "superadmin@example.com", password: "1234" },
];

const STATIC_PAGES = [
  "/lms",
  "/lms/dashboard",
  "/lms/my-learning",
  "/lms/student/dashboard",
  "/lms/instructor",
  "/lms/instructor/profile",
  "/lms/instructor/courses",
  "/lms/instructor/course-support",
  "/lms/courses",
  "/lms/courses/new",
  "/lms/classes",
  "/lms/students",
  "/lms/instructors",
  "/lms/meetings",
  "/lms/subscriptions",
  "/lms/analytics",
  "/lms/settings",
];

const STATIC_APIS = [
  "/api/lms/dashboard",
  "/api/lms/public-config",
  "/api/lms/student/dashboard",
  "/api/lms/student/live-sessions",
  "/api/lms/live-sessions",
  "/api/lms/courses?view=learner",
  "/api/lms/enrollment-options",
  "/api/lms/subscription-plans",
  "/api/lms/analytics/summary",
  "/api/lms/settings",
  "/api/lms/instructor-profiles",
  "/api/lms/instructor/course-support",
];

function parseSetCookie(headers) {
  const raw = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  if (raw.length) return raw.map((c) => c.split(";")[0]).join("; ");
  const single = headers.get("set-cookie");
  if (!single) return "";
  return single
    .split(/,(?=[^;]+?=)/)
    .map((c) => c.split(";")[0].trim())
    .join("; ");
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  });
  const cookie = parseSetCookie(res.headers);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok && body.ok, status: res.status, cookie, home: body.home, message: body.message };
}

async function fetchWithCookie(url, cookie, opts = {}) {
  const res = await fetch(`${BASE}${url}`, {
    ...opts,
    headers: { cookie, ...(opts.headers || {}) },
    redirect: "manual",
    signal: AbortSignal.timeout(120_000),
  });
  const loc = res.headers.get("location") || "";
  let snippet = "";
  if (res.status >= 400 || (res.status >= 300 && res.status < 400)) {
    const text = await res.text().catch(() => "");
    snippet = text.slice(0, 120).replace(/\s+/g, " ");
  }
  return { status: res.status, location: loc, snippet };
}

function classifyPage(result, path) {
  const { status, location } = result;
  if (status >= 200 && status < 300) return { outcome: "ok", detail: String(status) };
  if (status >= 300 && status < 400) {
    if (location.includes("/login")) return { outcome: "login_redirect", detail: location };
    if (location.includes("/dashboard") && !path.includes("dashboard"))
      return { outcome: "denied", detail: location };
    if (location.startsWith(path) || location.includes(path))
      return { outcome: "redirect", detail: location };
    return { outcome: "redirect", detail: location };
  }
  if (status >= 500) return { outcome: "error", detail: String(status) };
  return { outcome: "other", detail: `${status} ${location}` };
}

function classifyApi(result) {
  const { status } = result;
  if (status >= 200 && status < 300) return { outcome: "ok", detail: String(status) };
  if (status === 401 || status === 403) return { outcome: "denied", detail: String(status) };
  if (status >= 500) return { outcome: "error", detail: String(status) };
  return { outcome: "other", detail: String(status) };
}

async function main() {
  const prisma = new PrismaClient();
  const course = await prisma.course.findFirst({
    where: { organizationId: 1000n, slug: { startsWith: "pf-demo-lms-" } },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  await prisma.$disconnect();

  const courseId = course ? course.id.toString() : "2";
  const dynamicPages = [
    `/lms/courses/${courseId}`,
    `/lms/courses/${courseId}/edit`,
    `/lms/courses/${courseId}/content`,
    `/lms/my-learning/${courseId}`,
  ];
  const dynamicApis = [
    `/api/lms/courses/${courseId}`,
    `/api/lms/courses/${courseId}/learn`,
    `/api/lms/student/courses/${courseId}/progress`,
  ];

  const allPages = [...STATIC_PAGES, ...dynamicPages];
  const allApis = [...STATIC_APIS, ...dynamicApis];

  console.log(`LMS E2E — base ${BASE}, courseId=${courseId}\n`);

  let failures = 0;

  for (const account of ACCOUNTS) {
    console.log(`\n══ ${account.label} (${account.email}) ══`);
    const session = await login(account.email, account.password);
    if (!session.ok) {
      console.log(`  LOGIN FAILED: ${session.status} ${session.message || ""}`);
      failures++;
      continue;
    }
    console.log(`  login OK → home ${session.home || "(none)"}`);

    console.log("  Pages:");
    for (const p of allPages) {
      const r = await fetchWithCookie(p, session.cookie);
      const c = classifyPage(r, p);
      const mark = c.outcome === "error" ? "FAIL" : c.outcome === "ok" ? "OK" : c.outcome.toUpperCase();
      if (c.outcome === "error") failures++;
      console.log(`    [${mark}] ${p} — ${c.detail}`);
    }

    console.log("  APIs:");
    for (const a of allApis) {
      const r = await fetchWithCookie(a, session.cookie, {
        headers: { accept: "application/json" },
      });
      const c = classifyApi(r);
      const mark = c.outcome === "error" ? "FAIL" : c.outcome === "ok" ? "OK" : c.outcome.toUpperCase();
      if (c.outcome === "error") failures++;
      console.log(`    [${mark}] ${a} — ${c.detail}${r.snippet ? ` — ${r.snippet}` : ""}`);
    }
  }

  console.log(`\n── Summary: ${failures} failure(s) ──`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
