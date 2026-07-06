import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { FeedbackTab, FooterSection, Navbar } from "@/components/landing/landing-page";
import { LANDING_BRAND } from "@/lib/landing-brand-colors";
import { getLandingPageSettingsFromDb } from "@/lib/landing-page-data";
import type { LandingPageSettings } from "@/lib/landing-page-data";
import { industries, industryCategories } from "@/lib/landing-industries-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industry = industries.find((i) => i.slug === slug);
  if (!industry) return { title: "Industry" };
  return {
    title: `${industry.name} — Paper Flight`,
    description: industry.description,
  };
}

export default async function IndustryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  noStore();
  const { slug } = await params;
  const industry = industries.find((i) => i.slug === slug);
  if (!industry) notFound();

  const store = await cookies();

  let settings: LandingPageSettings = {
    company_name: "WorkDo Dash",
    contact_email: null,
    contact_phone: null,
    contact_address: null,
    config_sections: null,
    enable_registration: true,
    admin_settings: {},
  };

  try {
    const result = await getLandingPageSettingsFromDb();
    settings = result.settings;
  } catch {
    // use defaults
  }

  const isAuthenticated = !!store.get("pf_role")?.value;
  const userEmail = store.get("pf_email")?.value ?? undefined;
  const categoryLabel = industryCategories[industry.category];

  return (
    <div className="min-h-screen" style={{ backgroundColor: LANDING_BRAND.softPageBg }}>
      <Navbar settings={settings} isAuthenticated={isAuthenticated} userEmail={userEmail} theme="bulkMarketing" />
      <main>
        <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <Link
            href="/industries"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#1877F2] hover:text-[#1DA1F2] hover:underline"
            data-testid="link-back-industries"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            All industries
          </Link>

          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{categoryLabel}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{industry.name}</h1>
          <p className="mt-4 max-w-3xl text-base text-muted-foreground sm:text-lg">{industry.description}</p>

          <div className="relative mt-10 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="relative aspect-[21/9] w-full max-h-[420px] bg-muted">
              <Image
                src={industry.industryImg}
                alt=""
                fill
                className="object-cover object-center"
                sizes="(max-width: 1280px) 100vw, 1280px"
                priority
              />
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1877F2] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1DA1F2]"
              data-testid="link-industry-signup"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/industries"
              className="inline-flex items-center rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm hover:bg-accent transition-colors"
            >
              Browse industries
            </Link>
          </div>
        </article>
      </main>
      <FooterSection settings={settings} footerLayout="bulk" />
      <FeedbackTab />
    </div>
  );
}
