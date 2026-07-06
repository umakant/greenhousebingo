/** Client helper: refresh pf_permissions / pf_activated_packages after plan changes. */
export async function refreshSessionAuthCookies(): Promise<void> {
  await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
}
