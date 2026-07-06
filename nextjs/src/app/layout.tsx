import type { Metadata } from "next";
import "./globals.css";
import { ThemeToaster } from "@/components/theme-toaster";
import { TranslationProvider } from "@/components/translation-provider";
import { ConfirmDialogProvider } from "@/contexts/confirm-dialog-context";
import { BRAND_BOOT_SERVER_STYLE_ID, buildBrandThemeBootScript } from "@/lib/brand-theme";
import { getServerBrandThemeStyleBlock } from "@/lib/brand-theme-server";
import { getSiteSeo, siteSeoOgImageUrl } from "@/lib/site-seo";

function metadataBaseUrl(): URL {
  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").trim();
  try {
    const u = raw.replace(/\/+$/, "");
    return new URL(u);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSiteSeo();
  const base = metadataBaseUrl();
  const imageResolved = seo.image ? siteSeoOgImageUrl(seo.image) : "";
  const ogImages = imageResolved.length > 0 ? [{ url: imageResolved }] : undefined;

  const keywordList = seo.keywords
    ? seo.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    : [];

  return {
    metadataBase: base,
    title: seo.title,
    description: seo.description,
    ...(keywordList.length > 0 ? { keywords: keywordList } : {}),
    openGraph: {
      title: seo.title,
      description: seo.description,
      type: "website",
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: imageResolved ? "summary_large_image" : "summary",
      title: seo.title,
      description: seo.description,
      ...(ogImages ? { images: [ogImages[0].url] } : {}),
    },
  };
}

const themeScript = `
(() => {
  try {
    var raw = localStorage.getItem('pf_theme');
    var mode = (raw === 'light' || raw === 'dark' || raw === 'system') ? raw : 'system';
    var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var effective = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
    document.documentElement.classList.toggle('dark', effective === 'dark');
    document.documentElement.dataset.theme = effective;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'theme-color'); document.head.appendChild(meta); }
    meta.setAttribute('content', effective === 'dark' ? '#1a1d2e' : '#ffffff');
  } catch {}
})();
`;

const brandThemeBootScript = buildBrandThemeBootScript();

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const brandThemeCss = await getServerBrandThemeStyleBlock();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" suppressHydrationWarning />
        {brandThemeCss ? (
          <style
            id={BRAND_BOOT_SERVER_STYLE_ID}
            dangerouslySetInnerHTML={{ __html: brandThemeCss }}
          />
        ) : null}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: brandThemeBootScript }} />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <TranslationProvider>
          <ConfirmDialogProvider>
            {children}
            <ThemeToaster />
          </ConfirmDialogProvider>
        </TranslationProvider>
      </body>
    </html>
  );
}
