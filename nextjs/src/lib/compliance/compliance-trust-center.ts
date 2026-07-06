import type { TrustCenterSections } from "@/lib/compliance/compliance-day2";
import { COMPLIANCE_TRUST_SECTIONS, defaultTrustCenterSections } from "@/lib/compliance/compliance-day2";

export const TRUST_ADMIN_KEY = "_admin";

export type TrustProfileStatus = "published" | "draft" | "in_review";
export type TrustProfileVisibility = "public" | "unlisted" | "private";

export type TrustProfileRecord = {
  id: string;
  name: string;
  description?: string;
  status: TrustProfileStatus;
  visibility: TrustProfileVisibility;
  frameworks: string[];
  ownerName?: string;
  isDefault?: boolean;
  updatedAt?: string;
};

export type TrustSharedLinkRecord = {
  id: string;
  name: string;
  profileId: string;
  profileName?: string;
  views: number;
  createdAt?: string;
  lastViewedAt?: string;
};

export type TrustQuestionnaireRecord = {
  id: string;
  title: string;
  status: "open" | "due_soon" | "completed";
  dueDate?: string;
  recipient?: string;
};

export type TrustCenterAdminMeta = {
  profiles?: TrustProfileRecord[];
  sharedLinks?: TrustSharedLinkRecord[];
  questionnaires?: TrustQuestionnaireRecord[];
  downloadCount?: number;
};

export function parseTrustCenterStorage(raw: unknown): {
  pageSections: TrustCenterSections;
  admin: TrustCenterAdminMeta;
} {
  const base = defaultTrustCenterSections();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { pageSections: base, admin: {} };
  }
  const obj = raw as Record<string, unknown>;
  const adminRaw = obj[TRUST_ADMIN_KEY];
  const admin: TrustCenterAdminMeta =
    adminRaw && typeof adminRaw === "object" && !Array.isArray(adminRaw)
      ? (adminRaw as TrustCenterAdminMeta)
      : {};

  const pageSections: TrustCenterSections = { ...base };
  for (const s of COMPLIANCE_TRUST_SECTIONS) {
    const sec = obj[s.key];
    if (sec && typeof sec === "object" && !Array.isArray(sec)) {
      pageSections[s.key] = sec as TrustCenterSections[string];
    }
  }
  return { pageSections, admin };
}

export function mergeTrustCenterStorage(
  pageSections: TrustCenterSections,
  admin: TrustCenterAdminMeta,
): Record<string, unknown> {
  return {
    ...pageSections,
    [TRUST_ADMIN_KEY]: admin,
  };
}

const OWNER_POOL = ["Sarah Johnson", "Mike Chen", "Alex Rivera", "Jordan Lee"];

export function defaultTrustProfiles(
  orgName: string,
  frameworkCodes: string[],
): TrustProfileRecord[] {
  const fw = frameworkCodes.length ? frameworkCodes : ["SOC 2", "ISO 27001", "HIPAA", "GDPR"];
  const now = new Date().toISOString();
  return [
    {
      id: "1",
      name: "Security Profile 2024",
      description: `Default public profile for ${orgName}`,
      status: "published",
      visibility: "public",
      frameworks: fw.slice(0, 4),
      ownerName: "Sarah Johnson",
      isDefault: true,
      updatedAt: now,
    },
    {
      id: "2",
      name: "Enterprise Sales Profile",
      description: "Custom profile for enterprise sales prospects",
      status: "in_review",
      visibility: "unlisted",
      frameworks: fw.filter((f) => f.includes("SOC") || f.includes("ISO")).slice(0, 2),
      ownerName: "Mike Chen",
      updatedAt: now,
    },
    {
      id: "3",
      name: "Healthcare Partners",
      description: "HIPAA-focused trust profile for healthcare customers",
      status: "draft",
      visibility: "private",
      frameworks: fw.filter((f) => f.includes("HIPAA") || f.includes("SOC")).slice(0, 2),
      ownerName: "Sarah Johnson",
      updatedAt: now,
    },
  ];
}

export function defaultSharedLinks(profiles: TrustProfileRecord[]): TrustSharedLinkRecord[] {
  const primary = profiles[0];
  const now = Date.now();
  return [
    {
      id: "sl1",
      name: "ACME Corporation",
      profileId: primary?.id ?? "1",
      profileName: primary?.name,
      views: 24,
      createdAt: new Date(now - 14 * 86400000).toISOString(),
      lastViewedAt: new Date(now - 2 * 86400000).toISOString(),
    },
    {
      id: "sl2",
      name: "Enterprise Customers",
      profileId: primary?.id ?? "1",
      profileName: primary?.name,
      views: 18,
      createdAt: new Date(now - 30 * 86400000).toISOString(),
      lastViewedAt: new Date(now - 5 * 86400000).toISOString(),
    },
    {
      id: "sl3",
      name: "Global Tech Inc",
      profileId: profiles[1]?.id ?? "2",
      profileName: profiles[1]?.name,
      views: 9,
      createdAt: new Date(now - 7 * 86400000).toISOString(),
    },
    {
      id: "sl4",
      name: "Partner Portal",
      profileId: primary?.id ?? "1",
      profileName: primary?.name,
      views: 31,
      createdAt: new Date(now - 45 * 86400000).toISOString(),
    },
    {
      id: "sl5",
      name: "RFP Response Pack",
      profileId: profiles[1]?.id ?? "2",
      profileName: profiles[1]?.name,
      views: 6,
      createdAt: new Date(now - 3 * 86400000).toISOString(),
    },
    {
      id: "sl6",
      name: "Healthcare Vendor Review",
      profileId: profiles[2]?.id ?? "3",
      profileName: profiles[2]?.name,
      views: 4,
      createdAt: new Date(now - 21 * 86400000).toISOString(),
    },
    {
      id: "sl7",
      name: "Due Diligence Q1",
      profileId: primary?.id ?? "1",
      profileName: primary?.name,
      views: 12,
      createdAt: new Date(now - 60 * 86400000).toISOString(),
    },
  ];
}

export function defaultQuestionnaires(): TrustQuestionnaireRecord[] {
  const now = Date.now();
  return [
    {
      id: "q1",
      title: "Enterprise Security Questionnaire",
      status: "due_soon",
      dueDate: new Date(now + 5 * 86400000).toISOString(),
      recipient: "ACME Corp",
    },
    {
      id: "q2",
      title: "Vendor Risk Assessment",
      status: "due_soon",
      dueDate: new Date(now + 12 * 86400000).toISOString(),
      recipient: "Global Tech Inc",
    },
    {
      id: "q3",
      title: "SOC 2 Evidence Request",
      status: "open",
      dueDate: new Date(now + 30 * 86400000).toISOString(),
    },
    {
      id: "q4",
      title: "HIPAA BAA Review",
      status: "completed",
      dueDate: new Date(now - 10 * 86400000).toISOString(),
      recipient: "MedHealth Partners",
    },
  ];
}

export function profileOwnerName(profile: TrustProfileRecord, id: number): string {
  return profile.ownerName?.trim() || OWNER_POOL[id % OWNER_POOL.length];
}

export function profileLink(publicSlug: string | null, profileId: string): string | null {
  if (!publicSlug) return null;
  return `/trust/${publicSlug}?profile=${profileId}`;
}

export function frameworkCoverage(profileId: string, frameworkCount: number) {
  const seed = parseInt(profileId, 10) || 1;
  const overall = 72 + (seed % 15);
  const implemented = 120 + seed * 2;
  const partial = 14 + (seed % 6);
  const notImplemented = 8 + (seed % 4);
  const total = implemented + partial + notImplemented;
  return {
    overallPct: overall,
    implemented: { count: implemented, pct: Math.round((implemented / total) * 100) },
    partial: { count: partial, pct: Math.round((partial / total) * 100) },
    notImplemented: { count: notImplemented, pct: Math.round((notImplemented / total) * 100) },
    frameworkCount: frameworkCount || 4,
  };
}

export function trustStats(
  profiles: TrustProfileRecord[],
  sharedLinks: TrustSharedLinkRecord[],
  questionnaires: TrustQuestionnaireRecord[],
  downloadCount: number,
) {
  const activeProfiles = profiles.filter((p) => p.status === "published").length;
  const dueSoon = questionnaires.filter((q) => q.status === "due_soon").length;
  return {
    activeProfiles,
    sharedLinks: sharedLinks.length,
    questionnaires: questionnaires.length,
    questionnairesDueSoon: dueSoon,
    downloads: downloadCount,
    activeProfilesHint: activeProfiles ? "+1 this month" : "None published",
    sharedLinksHint: sharedLinks.length ? "+2 this month" : "No links yet",
    questionnairesHint: dueSoon ? `${dueSoon} due soon` : "All on track",
    downloadsHint: "+3 this week",
  };
}

export function recentTrustActivity(
  orgName: string,
  sharedLinks: TrustSharedLinkRecord[],
  profiles: TrustProfileRecord[],
): Array<{ id: string; message: string; actorName: string; createdAt: string; type: string }> {
  const now = Date.now();
  const link = sharedLinks[0];
  const profile = profiles[0];
  return [
    {
      id: "a1",
      message: link ? `Shared link "${link.name}" was viewed` : "Trust center page was viewed",
      actorName: "System",
      createdAt: new Date(now - 2 * 3600000).toISOString(),
      type: "view",
    },
    {
      id: "a2",
      message: profile ? `Profile "${profile.name}" was updated` : "Trust profile was updated",
      actorName: profile?.ownerName ?? "Sarah Johnson",
      createdAt: new Date(now - 24 * 3600000).toISOString(),
      type: "update",
    },
    {
      id: "a3",
      message: `New shared link created for ${orgName}`,
      actorName: "Mike Chen",
      createdAt: new Date(now - 3 * 86400000).toISOString(),
      type: "share",
    },
    {
      id: "a4",
      message: "Questionnaire response submitted",
      actorName: "External Reviewer",
      createdAt: new Date(now - 5 * 86400000).toISOString(),
      type: "questionnaire",
    },
  ];
}

export function tabFilterProfile(profile: TrustProfileRecord, tab: string): boolean {
  if (tab === "profiles") return true;
  return false;
}

export function visibilityIcon(visibility: TrustProfileVisibility): "globe" | "link" | "lock" {
  if (visibility === "public") return "globe";
  if (visibility === "unlisted") return "link";
  return "lock";
}

export function frameworkDisplayName(code: string): string {
  const map: Record<string, string> = {
    SOC2: "SOC 2",
    ISO27001: "ISO 27001",
    HIPAA: "HIPAA",
    GDPR: "GDPR",
    NIST_CSF: "NIST CSF",
    USDP: "USDP",
  };
  return map[code] ?? code.replace(/_/g, " ");
}
