import { NextRequest, NextResponse } from "next/server";

import { getSettingsForOwner, upsertOwnerSettings } from "@/lib/settings-service";
import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { logStorefrontAudit, STOREFRONT_AUDIT_EVENTS } from "@/lib/storefront/storefront-audit";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import {
  STOREFRONT_MERCHANT_SETTINGS_DEFAULTS,
  STOREFRONT_SITE_IDENTITY_KEYS,
} from "@/lib/storefront/storefront-settings-keys";
import type { ThemeCustomizerContentState } from "@/lib/storefront/theme-customizer-content";
import { normalizeThemeCustomizerContentState } from "@/lib/storefront/theme-customizer-content";
import {
  deleteThemeForOrganization,
  disableThemeForOrganization,
  getThemeWithLatestVersion,
  replaceThemeVersionCustomizerContent,
  replaceThemeVersionStyleTokens,
  seedThemeVersionStyleTokensFromThemeFiles,
} from "@/lib/storefront/services/theme-service";

export const dynamic = "force-dynamic";

function jsonSafe(v: unknown): unknown {
  if (v == null) return v;
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(jsonSafe);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o)) {
      out[k] = jsonSafe(o[k]);
    }
    return out;
  }
  return v;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.VIEW });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let themeId: bigint;
  try {
    themeId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid theme id." }, { status: 400 });
  }

  const theme = await getThemeWithLatestVersion(org.organizationId, themeId);
  if (!theme) {
    return NextResponse.json({ ok: false, message: "Theme not found." }, { status: 404 });
  }

  const settings = await getSettingsForOwner(org.organizationId);
  const siteIdentity: Record<string, string> = {};
  for (const k of STOREFRONT_SITE_IDENTITY_KEYS) {
    siteIdentity[k] = settings[k] ?? STOREFRONT_MERCHANT_SETTINGS_DEFAULTS[k];
  }

  const base = jsonSafe(theme) as Record<string, unknown>;
  return NextResponse.json({
    ok: true,
    data: {
      ...base,
      siteIdentity,
    },
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.THEME_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let themeId: bigint;
  try {
    themeId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid theme id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    themeVersionId?: string;
    tokens?: Array<{ tokenKey: string; value: string; groupName?: string | null }>;
    customizerContent?: ThemeCustomizerContentState;
    /** Merchant site identity (logo, favicon, store name, …) — persisted as org storefront settings. */
    siteIdentity?: Record<string, unknown>;
  };

  if (body.action === "disable") {
    try {
      await disableThemeForOrganization(org.organizationId, themeId, org.userId, { ...saasActorFromRequest(req) });
      return NextResponse.json({ ok: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Disable failed.";
      return NextResponse.json({ ok: false, message: msg }, { status: 400 });
    }
  }

  let themeVersionId: bigint;
  try {
    themeVersionId = BigInt(String(body.themeVersionId ?? ""));
  } catch {
    return NextResponse.json({ ok: false, message: "themeVersionId required." }, { status: 400 });
  }

  if (body.action === "seed_style_tokens") {
    try {
      const { count } = await seedThemeVersionStyleTokensFromThemeFiles(
        org.organizationId,
        themeId,
        themeVersionId,
        org.userId,
        { ...saasActorFromRequest(req) },
      );
      const theme = await getThemeWithLatestVersion(org.organizationId, themeId);
      return NextResponse.json({ ok: true, seeded: count, data: theme ? jsonSafe(theme) : null });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Seed failed.";
      return NextResponse.json({ ok: false, message: msg }, { status: 400 });
    }
  }

  const hasTokens = Array.isArray(body.tokens);
  const hasCustomizer = body.customizerContent !== undefined;
  const hasSiteIdentity =
    body.siteIdentity != null && typeof body.siteIdentity === "object" && !Array.isArray(body.siteIdentity);

  if (!hasTokens && !hasCustomizer && !hasSiteIdentity) {
    return NextResponse.json(
      { ok: false, message: "Provide tokens, customizerContent, and/or siteIdentity." },
      { status: 400 },
    );
  }

  try {
    if (hasTokens) {
      await replaceThemeVersionStyleTokens(
        org.organizationId,
        themeId,
        themeVersionId,
        body.tokens!,
        org.userId,
        { ...saasActorFromRequest(req) },
      );
    }
    if (hasCustomizer) {
      const normalized = normalizeThemeCustomizerContentState(body.customizerContent);
      await replaceThemeVersionCustomizerContent(
        org.organizationId,
        themeId,
        themeVersionId,
        normalized,
        org.userId,
        { ...saasActorFromRequest(req) },
      );
    }
    if (hasSiteIdentity) {
      const si = body.siteIdentity as Record<string, unknown>;
      const items: { key: string; value: string; isPublic: boolean }[] = [];
      for (const k of STOREFRONT_SITE_IDENTITY_KEYS) {
        if (!(k in si)) continue;
        let v = String(si[k] ?? "");
        if (k === "sf_display_site_title_tagline") {
          v = v === "0" || v.toLowerCase() === "false" ? "0" : "1";
        }
        items.push({ key: k, value: v, isPublic: true });
      }
      if (items.length > 0) {
        await upsertOwnerSettings(org.organizationId, items);
        await logStorefrontAudit({
          organizationId: org.organizationId,
          eventType: STOREFRONT_AUDIT_EVENTS.SETTINGS_UPDATE,
          actorUserId: org.userId,
          resourceType: "merchant_settings",
          resourceId: org.organizationId.toString(),
          message: "Storefront site identity updated from theme customizer",
          metadata: { keys: items.map((i) => i.key), source: "theme_customizer" },
          saas: { ...saasActorFromRequest(req) },
        });
      }
    }
    const theme = await getThemeWithLatestVersion(org.organizationId, themeId);
    const settingsOut = await getSettingsForOwner(org.organizationId);
    const siteIdentity: Record<string, string> = {};
    for (const k of STOREFRONT_SITE_IDENTITY_KEYS) {
      siteIdentity[k] = settingsOut[k] ?? STOREFRONT_MERCHANT_SETTINGS_DEFAULTS[k];
    }
    const base = theme ? (jsonSafe(theme) as Record<string, unknown>) : {};
    return NextResponse.json({
      ok: true,
      data: {
        ...base,
        siteIdentity,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Update failed.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.THEME_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let themeId: bigint;
  try {
    themeId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid theme id." }, { status: 400 });
  }

  try {
    await deleteThemeForOrganization(org.organizationId, themeId, org.userId, { ...saasActorFromRequest(req) });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Delete failed.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
