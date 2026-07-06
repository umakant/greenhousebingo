import { cookies } from "next/headers";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import PublicLandingShell from "@/components/landing/public-shell";
import { prisma } from "@/lib/prisma";
import { getLandingPageSettingsFromDb } from "@/lib/landing-page-data";

type Params = { slug: string };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.customPage.findFirst({
    where: { slug, isActive: true },
    select: { metaTitle: true, metaDescription: true, title: true },
  });
  if (!page) return {};
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
  };
}

export default async function CustomPage({ params }: { params: Promise<Params> }) {
  const { landingPageEnabled, settings } = await getLandingPageSettingsFromDb();
  if (!landingPageEnabled) redirect("/login");

  const store = await cookies();
  const isAuthenticated = !!store.get("pf_role")?.value;
  const userEmail = store.get("pf_email")?.value ?? undefined;

  const { slug } = await params;
  const page = await prisma.customPage.findFirst({
    where: { slug, isActive: true },
    select: { title: true, content: true },
  });
  if (!page) notFound();

  return (
    <PublicLandingShell
      settings={{ ...settings, is_authenticated: isAuthenticated, user_email: userEmail }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{page.title}</h1>
        <div
          className="prose prose-sm max-w-none mt-6 [&_a]:text-blue-600 [&_a]:underline hover:[&_a]:text-blue-800"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>
    </PublicLandingShell>
  );
}

