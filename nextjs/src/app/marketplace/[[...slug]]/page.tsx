import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PublicLandingShell from "@/components/landing/public-shell";
import { getLandingPageSettingsFromDb } from "@/lib/landing-page-data";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { landingPageEnabled, settings } = await getLandingPageSettingsFromDb();
  if (!landingPageEnabled) redirect("/login");

  const store = await cookies();
  const isAuthenticated = !!store.get("pf_role")?.value;
  const userEmail = store.get("pf_email")?.value ?? undefined;

  const { slug } = await params;
  const slugText = (slug || []).join("/");

  return (
    <PublicLandingShell
      settings={{ ...settings, is_authenticated: isAuthenticated, user_email: userEmail }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-sm text-slate-500">Coming soon</div>
        <h1 className="mt-2 text-3xl md:text-4xl font-bold text-slate-900">Marketplace</h1>
        {slugText ? (
          <p className="mt-2 text-sm text-slate-600">
            Slug: <span className="font-mono">{slugText}</span>
          </p>
        ) : null}
        <p className="mt-4 text-slate-700 max-w-2xl">
          Marketplace will be ported next (DB-backed modules/addons catalog + UI parity with Laravel’s Marketplace).
        </p>
      </div>
    </PublicLandingShell>
  );
}

