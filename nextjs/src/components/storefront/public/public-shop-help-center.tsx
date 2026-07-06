import Link from "next/link";

import type { PublicStorefrontBrandSettings } from "@/lib/storefront/public-storefront-settings";

type Article = {
  id: bigint;
  title: string;
  description: string | null;
  category: { id: bigint; name: string } | null;
};

export function PublicShopHelpHome({
  publicSettings,
  articles,
}: {
  publicSettings: PublicStorefrontBrandSettings;
  articles: Article[];
}) {
  const name = publicSettings.storeName?.trim() || "Shop";
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-3xl flex-col gap-8 px-4 py-12">
      <header>
        <p className="text-sm text-muted-foreground">
          <Link href="/shop" className="underline-offset-4 hover:underline">
            ← {name}
          </Link>
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Help center</h1>
        <p className="mt-2 text-muted-foreground">Browse articles for this store.</p>
      </header>
      <ul className="divide-y rounded-xl border">
        {articles.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-muted-foreground">No articles yet.</li>
        ) : (
          articles.map((a) => (
            <li key={a.id.toString()}>
              <Link
                href={`/shop/help/articles/${a.id.toString()}`}
                className="block px-4 py-4 transition hover:bg-muted/40"
              >
                <span className="font-medium">{a.title}</span>
                {a.category ? (
                  <span className="ml-2 text-xs text-muted-foreground">· {a.category.name}</span>
                ) : null}
                {a.description ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.description}</p> : null}
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function PublicShopHelpArticle({
  publicSettings,
  article,
}: {
  publicSettings: PublicStorefrontBrandSettings;
  article: Article & { description: string | null };
}) {
  const name = publicSettings.storeName?.trim() || "Shop";
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-muted-foreground">
        <Link href="/shop/help" className="underline-offset-4 hover:underline">
          Help center
        </Link>
        <span className="mx-2">·</span>
        <Link href="/shop" className="underline-offset-4 hover:underline">
          {name}
        </Link>
      </p>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">{article.title}</h1>
      {article.category ? (
        <p className="mt-2 text-sm text-muted-foreground">{article.category.name}</p>
      ) : null}
      <div
        className="prose prose-neutral mt-8 max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{
          __html: article.description ?? "<p>No content.</p>",
        }}
      />
    </article>
  );
}
