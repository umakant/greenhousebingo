import { prisma } from "@/lib/prisma";
import type { SettingsBlob } from "@/lib/settings-service";

/** Square marks first — best for avatars and collapsed sidebar icons. */
export function resolveCompanyBrandImagePaths(
  settings: SettingsBlob | Record<string, string> | null | undefined,
  userAvatar?: string | null,
): string[] {
  const s = settings ?? {};
  const candidates = [
    s.logo_icon,
    s.favicon,
    s.logo_light,
    s.logo_dark,
    userAvatar,
  ]
    .map((p) => String(p ?? "").trim())
    .filter(Boolean);
  return [...new Set(candidates)];
}

/** Primary path for company list avatars and synced user.avatar. */
export function resolveCompanyListAvatarPath(
  settings: SettingsBlob | Record<string, string> | null | undefined,
  userAvatar?: string | null,
): string {
  return resolveCompanyBrandImagePaths(settings, userAvatar)[0] ?? "";
}

/** Wide logo for headers and expanded branding. */
export function resolveCompanyLogoFromSettings(
  settings: SettingsBlob | Record<string, string> | null | undefined,
): string | null {
  if (!settings) return null;
  const light = String(settings.logo_light ?? "").trim();
  const dark = String(settings.logo_dark ?? "").trim();
  return light || dark || null;
}

/** Collapsed sidebar icon — square mark, then favicon, then wide logos. */
export function resolveCompanySidebarIconPaths(
  settings: SettingsBlob | Record<string, string> | null | undefined,
): string[] {
  const s = settings ?? {};
  const candidates = [s.logo_icon, s.favicon, s.logo_light, s.logo_dark]
    .map((p) => String(p ?? "").trim())
    .filter(Boolean);
  return [...new Set(candidates)];
}

export function resolveCompanyUserAvatar(
  user: { type?: string | null; avatar?: string | null },
  settings?: SettingsBlob | Record<string, string> | null,
): string | null {
  if (user.type === "company") {
    const logo = resolveCompanyListAvatarPath(settings ?? null, user.avatar);
    if (logo) return logo;
  }
  return user.avatar?.trim() || null;
}

export async function syncCompanyUserAvatarFromSettings(
  userId: bigint,
  settings: SettingsBlob | Record<string, string>,
): Promise<void> {
  const logo = resolveCompanyListAvatarPath(settings);
  if (!logo) return;
  await prisma.user.update({
    where: { id: userId },
    data: { avatar: logo },
  });
}
