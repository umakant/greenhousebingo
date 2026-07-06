import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar } from "lucide-react";

import type { PublicBlogPostSummary } from "@/lib/storefront/public-catalog";
import type { PublicStorefrontBrandSettings } from "@/lib/storefront/public-storefront-settings";
import { cn } from "@/lib/utils";

import { PublishedPageChrome } from "@/components/storefront/public/published-page-view";
import { PublicBlogCommentsSection } from "@/components/storefront/public/public-blog-comments-section";

function formatPostDate(d: Date | null): string | null {
  if (!d) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function excerptPlain(post: PublicBlogPostSummary, maxLen: number): string {
  const ex = post.excerpt?.trim();
  if (ex) {
    if (ex.length <= maxLen) return ex;
    return `${ex.slice(0, maxLen - 1).trim()}…`;
  }
  const raw = post.bodyHtml?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? "";
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, maxLen - 1).trim()}…`;
}

export function PublicBlogListView({
  publicSettings,
  posts,
  websiteId,
  style,
  themeChrome,
}: {
  publicSettings: PublicStorefrontBrandSettings;
  posts: PublicBlogPostSummary[];
  websiteId: string;
  style?: CSSProperties;
  /** When true, content mounts inside Liquid theme `#pf-react-main-slot` (skip React chrome). */
  themeChrome?: boolean;
}) {
  const name = publicSettings.storeName?.trim() || "Shop";
  const tc = Boolean(themeChrome);
  const inner = (
    <main
      className={cn(
        tc
          ? "mx-auto w-full max-w-7xl section section--padding px-4 sm:px-6 lg:px-8 md:py-10"
          : "mx-auto w-full max-w-3xl flex-1 px-4 py-10",
      )}
      {...(tc ? { style } : {})}
    >
      <p className="text-sm text-muted-foreground">
        <Link href="/shop" className="underline-offset-4 hover:underline">
          ← {name}
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Latest stories</h1>
      <p className="mt-2 text-sm text-muted-foreground">News and updates from the store.</p>
      <ul className="mt-8 divide-y rounded-xl border">
        {posts.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">No posts yet.</li>
        ) : (
          posts.map((p) => {
            const href = `/shop/blog/${encodeURIComponent(p.slug)}`;
            const when = formatPostDate(p.publishedAt ?? p.updatedAt);
            return (
              <li key={p.slug}>
                <Link href={href} className="flex gap-4 px-4 py-4 transition hover:bg-muted/40">
                  {p.featuredImageUrl ? (
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted">
                      <Image
                        src={p.featuredImageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="h-20 w-20 shrink-0 rounded-md border bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    {p.category ? (
                      <span className="text-xs font-medium text-muted-foreground">{p.category}</span>
                    ) : null}
                    <span className="mt-0.5 block font-medium leading-snug">{p.title}</span>
                    {when ? <span className="mt-1 block text-xs text-muted-foreground">{when}</span> : null}
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{excerptPlain(p, 200)}</p>
                  </div>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </main>
  );
  if (tc) return inner;
  return (
    <PublishedPageChrome publicSettings={publicSettings} title="Blog" websiteId={websiteId} style={style}>
      {inner}
    </PublishedPageChrome>
  );
}

export function PublicBlogPostView({
  publicSettings,
  post,
  websiteId,
  style,
  themeChrome,
}: {
  publicSettings: PublicStorefrontBrandSettings;
  post: PublicBlogPostSummary;
  websiteId: string;
  style?: CSSProperties;
  themeChrome?: boolean;
}) {
  const name = publicSettings.storeName?.trim() || "Shop";
  const when = formatPostDate(post.publishedAt ?? post.updatedAt);
  const pageTitle = post.seoTitle?.trim() || post.title;
  const categoryLabel = post.category?.trim() || "Article";
  const heroImage = post.featuredImageUrl?.trim() || null;
  const tc = Boolean(themeChrome);

  const article = (
    <article className="flex min-h-0 w-full flex-1 flex-col bg-background">
        {/* Hero — OS2-style full bleed; meta + title over image (header sits in theme chrome above). */}
        <section className="relative isolate min-h-[min(68vh,600px)] w-full overflow-hidden bg-neutral-900 md:min-h-[min(74vh,720px)]">
          {heroImage ? (
            <>
              <Image
                src={heroImage}
                alt=""
                fill
                className="object-cover object-center"
                priority
                sizes="100vw"
                unoptimized
              />
              <div
                className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/80"
                aria-hidden
              />
            </>
          ) : (
            <div
              className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black"
              aria-hidden
            />
          )}

          <div className="relative z-10 flex min-h-[min(68vh,600px)] flex-col justify-end px-4 pb-14 pt-28 md:min-h-[min(74vh,720px)] md:px-[min(6vw,4rem)] md:pb-20 md:pt-36 lg:px-[min(8vw,5rem)]">
            <div className="mx-auto flex w-full max-w-[min(100%,52rem)] flex-col gap-5 md:gap-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="inline-flex items-center rounded-full bg-lime-500 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-950 shadow-sm ring-1 ring-white/20">
                  {categoryLabel}
                </span>
                {when ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-white/95">
                    <Calendar className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <time
                      dateTime={(post.publishedAt ?? post.updatedAt ?? undefined)?.toISOString()}
                    >
                      {when}
                    </time>
                    <span className="text-white/45" aria-hidden>
                      ·
                    </span>
                    <span>by {name}</span>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-white/95">
                    <span>by {name}</span>
                  </p>
                )}
              </div>
              <h1 className="text-balance text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl md:leading-[1.06] lg:text-[clamp(2.75rem,5.2vw,4.25rem)] lg:leading-[1.05]">
                {post.title}
              </h1>
            </div>
          </div>
        </section>

        {/* Overlapping content “card” — large rounded top, sits up on hero like Concept article.liquid */}
        <div
          className={cn(
            "relative z-10 -mt-14 w-full overflow-hidden md:-mt-24 lg:-mt-[7.5rem]",
            "rounded-t-[2.25rem] bg-background sm:rounded-t-[2.75rem] md:rounded-t-[3.25rem] lg:rounded-t-[3.75rem]",
            "flex-1 shadow-[0_-28px_80px_-20px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.04]",
          )}
        >
          <div className="mx-auto max-w-[52rem] flex-1 px-5 py-12 sm:px-8 md:px-10 md:py-16 lg:px-12 lg:py-20">
            <nav
              className="mb-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
              aria-label="Breadcrumb"
            >
              <Link href="/shop/blog" className="underline-offset-4 transition hover:text-foreground hover:underline">
                Blog
              </Link>
              <span className="mx-2 text-muted-foreground/60" aria-hidden>
                ·
              </span>
              <Link href="/shop" className="underline-offset-4 transition hover:text-foreground hover:underline">
                {name}
              </Link>
            </nav>
            {post.bodyHtml?.trim() ? (
              <div
                className={cn(
                  "prose prose-neutral max-w-none text-foreground dark:prose-invert",
                  "prose-headings:scroll-mt-24 prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-2xl prose-h2:md:text-3xl",
                  "prose-p:leading-[1.75] prose-li:leading-relaxed",
                  "[&>p:first-of-type]:mt-0 [&>p:first-of-type]:text-pretty [&>p:first-of-type]:text-xl [&>p:first-of-type]:font-semibold [&>p:first-of-type]:leading-snug [&>p:first-of-type]:text-foreground sm:[&>p:first-of-type]:text-2xl md:[&>p:first-of-type]:text-[1.65rem] md:[&>p:first-of-type]:leading-snug",
                  "[&>p:first-of-type]:mb-8 md:[&>p:first-of-type]:mb-10",
                )}
                dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
              />
            ) : (
              <p className="text-pretty text-lg text-muted-foreground">
                This article does not have body content yet. Check back soon.
              </p>
            )}
            <PublicBlogCommentsSection postSlug={post.slug} />
          </div>
        </div>
      </article>
  );

  if (tc) {
    return (
      <main className="w-full min-w-0 bg-background" style={style}>
        {article}
      </main>
    );
  }

  return (
    <PublishedPageChrome publicSettings={publicSettings} title={pageTitle} websiteId={websiteId} style={style}>
      {article}
    </PublishedPageChrome>
  );
}
