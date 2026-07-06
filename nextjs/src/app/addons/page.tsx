import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PublicLandingShell from "@/components/landing/public-shell";
import { getLandingPageSettingsFromDb } from "@/lib/landing-page-data";

export const dynamic = "force-dynamic";

export default async function AddonsPage() {
  const { landingPageEnabled, settings } = await getLandingPageSettingsFromDb();
  if (!landingPageEnabled) redirect("/login");

  const store = await cookies();
  const isAuthenticated = !!store.get("pf_role")?.value;
  const userEmail = store.get("pf_email")?.value ?? undefined;

  return (
    <PublicLandingShell
      settings={{ ...settings, is_authenticated: isAuthenticated, user_email: userEmail }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-sm text-slate-500">Coming soon</div>
        <h1 className="mt-2 text-3xl md:text-4xl font-bold text-slate-900">Add-Ons</h1>
        <p className="mt-4 text-slate-700 max-w-2xl">
          This page will be ported next (filters, sorting, pagination, and UI parity with Laravel’s LandingPage Addons
          screen).
        </p>
      </div>
    </PublicLandingShell>
  );
}

