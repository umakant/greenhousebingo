"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, Globe, Loader2, Paintbrush } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type ThemeOption = {
  slug: string;
  name: string;
  description: string;
  previewImage: string | null;
  previewUrl: string;
  previewPageUrl: string;
};

type Props = {
  value: string;
  disabled?: boolean;
  onChange: (slug: string) => void;
  /** Hide the internal section heading when embedded in a settings shell. */
  embedded?: boolean;
  /** Public preview base path (e.g. /sites/DN-0001-CO-26). */
  publicSiteHref?: string;
};

function ThemePreviewFrame({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-md border bg-background", className)}>
      <iframe src={src} title={title} className="h-full w-full border-0 bg-white" loading="lazy" tabIndex={-1} />
    </div>
  );
}

function ThemeThumbnail({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-md border bg-muted/30", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-cover object-top" />
    </div>
  );
}

export function CompanyThemePicker({ value, disabled, onChange, embedded = false, publicSiteHref = "/company-website" }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [themes, setThemes] = React.useState<ThemeOption[]>([]);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/company-themes", { credentials: "include" });
        const data = await res.json();
        if (data?.ok && Array.isArray(data.themes)) {
          setThemes(data.themes as ThemeOption[]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedTheme = themes.find((t) => t.slug === value) ?? null;

  return (
    <div className="space-y-4">
      {!embedded ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-base font-medium">Company Website Theme</h3>
            </div>
            {value ? (
              <a
                href={publicSiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), disabled && "pointer-events-none opacity-60")}
              >
                Preview site
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
          <Separator className="my-2" />
        </>
      ) : null}

      <p className="text-sm text-muted-foreground">
        Choose a marketing theme for your company’s public website. Each company manages its own site independently.
        After saving, preview it at <code className="rounded bg-muted px-1 text-xs">{publicSiteHref}</code> (no sign-in required).
      </p>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading themes…
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("")}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors hover:bg-muted/40",
              value === "" ? "border-primary ring-2 ring-primary/20" : "border-border",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            <p className="font-medium">None</p>
            <p className="mt-1 text-xs text-muted-foreground">No company website theme selected.</p>
          </button>

          {themes.map((theme) => (
            <button
              key={theme.slug}
              type="button"
              disabled={disabled}
              onClick={() => onChange(theme.slug)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors hover:bg-muted/40",
                value === theme.slug ? "border-primary ring-2 ring-primary/20" : "border-border",
                disabled && "pointer-events-none opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{theme.name}</p>
                {value === theme.slug ? (
                  <Badge variant="default" className="shrink-0">
                    Selected
                  </Badge>
                ) : null}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{theme.description}</p>
              {theme.previewImage ? (
                <ThemeThumbnail src={theme.previewImage} alt={`${theme.name} thumbnail`} className="mt-3 aspect-[16/10]" />
              ) : null}
            </button>
          ))}
        </div>
      )}

      {value ? (
        <p className="text-xs text-muted-foreground">
          Active theme: <span className="font-medium text-foreground">{selectedTheme?.name ?? value}</span>
        </p>
      ) : (
        <Label className="text-xs text-muted-foreground">No theme selected</Label>
      )}
    </div>
  );
}

export type CompanyThemeOption = ThemeOption;

export function CompanyWebsiteThemePreviewPanel({
  slug,
  themes,
  loading,
}: {
  slug: string;
  themes: ThemeOption[];
  loading: boolean;
}) {
  const theme = themes.find((t) => t.slug === slug) ?? null;
  const previewSrc = theme?.previewPageUrl || theme?.previewUrl || "";

  return (
    <div className="sticky top-20 space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <h3 className="font-medium">Theme Preview</h3>
        </div>
        {theme ? (
          <Link
            href="/settings/company-website-theme/customize"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Paintbrush className="h-3.5 w-3.5" />
            Customize
          </Link>
        ) : null}
      </div>

      {loading ? (
        <div className="flex h-[min(70vh,520px)] items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading preview…
        </div>
      ) : !theme ? (
        <div className="flex h-[min(70vh,520px)] items-center justify-center rounded-md border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
          Select a theme to see a live homepage preview.
        </div>
      ) : (
        <>
          <p className="text-sm font-medium">{theme.name}</p>
          <ThemePreviewFrame
            src={previewSrc}
            title={`Live preview of ${theme.name}`}
            className="h-[min(70vh,520px)]"
          />
        </>
      )}
    </div>
  );
}
