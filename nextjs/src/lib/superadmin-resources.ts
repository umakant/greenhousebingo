import type { SuperadminResource } from "@prisma/client";
import type { NextRequest } from "next/server";

import { isSuperAdminSession } from "@/lib/authz";

export const SUPERADMIN_RESOURCE_TYPES = ["DOCUMENT", "LINK", "VIDEO", "SPREADSHEET", "IMAGE"] as const;
export type SuperadminResourceType = (typeof SUPERADMIN_RESOURCE_TYPES)[number];

export const SUPERADMIN_RESOURCE_STATUSES = ["PUBLISHED", "DRAFT"] as const;
export type SuperadminResourceStatus = (typeof SUPERADMIN_RESOURCE_STATUSES)[number];

export type SuperadminResourceAddedBy = {
  id: string;
  name: string;
  email: string | null;
};

export type SuperadminResourceDto = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string | null;
  resourceType: SuperadminResourceType;
  status: SuperadminResourceStatus;
  isFavorite: boolean;
  addedBy: SuperadminResourceAddedBy | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string | null;
};

export type SuperadminResourceStats = {
  total: number;
  categories: number;
  documents: number;
  links: number;
  recentlyAdded: number;
  favorites: number;
  mine: number;
};

export function requireSuperadminResourcesAccess(req: NextRequest): boolean {
  return isSuperAdminSession(req);
}

export function readSessionUserId(req: NextRequest): bigint | null {
  const raw = req.cookies.get("pf_user_id")?.value?.trim();
  if (!raw || !/^\d+$/.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export function serializeSuperadminResource(
  r: SuperadminResource,
  addedBy?: SuperadminResourceAddedBy | null,
): SuperadminResourceDto {
  return {
    id: r.id.toString(),
    title: r.title,
    url: r.url,
    description: r.description,
    category: r.category,
    resourceType: (SUPERADMIN_RESOURCE_TYPES.includes(r.resourceType as SuperadminResourceType)
      ? r.resourceType
      : "LINK") as SuperadminResourceType,
    status: (SUPERADMIN_RESOURCE_STATUSES.includes(r.status as SuperadminResourceStatus)
      ? r.status
      : "PUBLISHED") as SuperadminResourceStatus,
    isFavorite: r.isFavorite,
    addedBy: addedBy ?? null,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt?.toISOString() ?? null,
  };
}

export function normalizeResourceUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t.slice(0, 2048);
  if (t.startsWith("/") && !t.startsWith("//")) return t.slice(0, 2048);
  try {
    const withProto = t.includes("://") ? t : `https://${t}`;
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString().slice(0, 2048);
  } catch {
    return null;
  }
}

function parseResourceType(raw: unknown): SuperadminResourceType | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim().toUpperCase();
  return SUPERADMIN_RESOURCE_TYPES.includes(t as SuperadminResourceType)
    ? (t as SuperadminResourceType)
    : null;
}

function parseStatus(raw: unknown): SuperadminResourceStatus | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim().toUpperCase();
  return SUPERADMIN_RESOURCE_STATUSES.includes(t as SuperadminResourceStatus)
    ? (t as SuperadminResourceStatus)
    : null;
}

export function parseResourceBody(body: unknown): {
  title: string;
  url: string;
  description: string | null;
  category: string | null;
  resourceType: SuperadminResourceType;
  status: SuperadminResourceStatus;
  isFavorite: boolean;
  sortOrder: number;
} | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid body." };

  const o = body as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim().slice(0, 255) : "";
  if (!title) return { error: "Title is required." };

  const urlRaw = typeof o.url === "string" ? o.url : "";
  const resourceType = o.resourceType != null ? parseResourceType(o.resourceType) : "LINK";
  if (o.resourceType != null && !resourceType) return { error: "Invalid resource type." };

  const url = normalizeResourceUrl(urlRaw);
  if (!url) {
    return {
      error: resourceType === "IMAGE" ? "Select or upload an image." : "A valid URL is required.",
    };
  }

  const description =
    typeof o.description === "string" ? o.description.trim().slice(0, 4000) || null : null;
  const category =
    typeof o.category === "string" ? o.category.trim().slice(0, 128) || null : null;

  const status = o.status != null ? parseStatus(o.status) : "PUBLISHED";
  if (o.status != null && !status) return { error: "Invalid status." };

  const isFavorite = typeof o.isFavorite === "boolean" ? o.isFavorite : false;

  let sortOrder = 0;
  if (typeof o.sortOrder === "number" && Number.isFinite(o.sortOrder)) {
    sortOrder = Math.max(0, Math.floor(o.sortOrder));
  } else if (typeof o.sortOrder === "string" && o.sortOrder.trim()) {
    const n = Number.parseInt(o.sortOrder, 10);
    if (Number.isFinite(n) && n >= 0) sortOrder = n;
  }

  return {
    title,
    url,
    description,
    category,
    resourceType: resourceType ?? "LINK",
    status: status ?? "PUBLISHED",
    isFavorite,
    sortOrder,
  };
}

export function resourceTypeLabel(type: SuperadminResourceType): string {
  if (type === "IMAGE") return "Image";
  return type.charAt(0) + type.slice(1).toLowerCase();
}

export function categoryBadgeClass(category: string | null | undefined): string {
  const key = (category ?? "").trim().toLowerCase();
  const map: Record<string, string> = {
    operations: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
    safety: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    training: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
    administration: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
    it: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  };
  return map[key] ?? "bg-muted text-muted-foreground";
}

export function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
