"use client";

import Link from "next/link";

type Banner = { id: string; title: string; imageUrl: string; linkUrl: string };

export function LmsAdBanners({ banners, className }: { banners: Banner[]; className?: string }) {
  if (!banners.length) return null;
  const gridClass = `grid gap-3 sm:grid-cols-2 ${className ?? ""}`;
  return (
    <div className={gridClass}>
      {banners.map((b) => {
        const inner = (
          <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.imageUrl} alt={b.title || "Promotion"} className="h-28 w-full object-cover" />
            {b.title ? <div className="px-2 py-1.5 text-xs font-medium">{b.title}</div> : null}
          </div>
        );
        if (b.linkUrl) {
          return (
            <Link key={b.id} href={b.linkUrl} target="_blank" rel="noopener noreferrer">
              {inner}
            </Link>
          );
        }
        return <div key={b.id}>{inner}</div>;
      })}
    </div>
  );
}
