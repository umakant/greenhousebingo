"use client";

import { Globe, Loader2, Plus, RefreshCw, Store, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";


export type WebsiteRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  defaultLocale: string | null;
};

export type DomainRow = {
  id: string;
  hostname: string;
  status: string;
  isPrimary: boolean;
};

export type StorefrontWebsitesSettingsProps = {
  loading: boolean;
  error: string | null;
  websites: WebsiteRow[];
  name: string;
  setName: (v: string) => void;
  slug: string;
  setSlug: (v: string) => void;
  onCreateWebsite: () => void;
  domainWebsiteId: string;
  setDomainWebsiteId: (v: string) => void;
  domains: DomainRow[];
  domainHostname: string;
  setDomainHostname: (v: string) => void;
  onAddDomain: () => void;
  onReloadDomains: () => void;
  onRemoveDomain: (id: string) => void;
};

function statusPill(status: string) {
  const s = status.toLowerCase();
  const isOk = s === "active" || s === "published" || s === "verified";
  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-normal capitalize",
        isOk &&
          "border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100",
      )}
    >
      {status}
    </Badge>
  );
}

/**
 * Storefront **Websites** + **Domains** admin — layout inspired by Shopify Online Store / domains
 * (index tables, muted chrome, clear hierarchy). Behavior matches the previous inline panels.
 */
export function StorefrontWebsitesSettings({
  loading,
  error,
  websites,
  name,
  setName,
  slug,
  setSlug,
  onCreateWebsite,
  domainWebsiteId,
  setDomainWebsiteId,
  domains,
  domainHostname,
  setDomainHostname,
  onAddDomain,
  onReloadDomains,
  onRemoveDomain,
}: StorefrontWebsitesSettingsProps) {
  const selectedSite = websites.find((w) => w.id === domainWebsiteId);

  return (
    <div className="w-full min-w-0 space-y-8">
      {error ? (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {/* Websites — list first (Shopify-style “resources”), then add */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{t("Websites")}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("Each website is a separate storefront. Customers reach it on /shop using the domains you connect below.")}
          </p>
        </div>

        <Card className="overflow-hidden border-border/80 shadow-sm">
          <CardHeader className="border-b bg-muted/30 px-6 py-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base font-semibold">{t("Your websites")}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {t("Name, URL handle, and lifecycle status.")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {websites.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Store className="h-6 w-6 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm font-medium text-foreground">{t("No websites yet")}</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  {t("Create your first website below. You can add custom domains after it exists.")}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b hover:bg-transparent">
                    <TableHead className="h-10 pl-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("Website")}
                    </TableHead>
                    <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("Handle")}
                    </TableHead>
                    <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("Status")}
                    </TableHead>
                    <TableHead className="h-10 pr-6 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("ID")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {websites.map((w) => (
                    <TableRow key={w.id} className="border-border/60 hover:bg-muted/20">
                      <TableCell className="pl-6 align-middle">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background shadow-sm">
                            <Globe className="h-4 w-4 text-muted-foreground" aria-hidden />
                          </span>
                          <span className="font-medium">{w.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle">
                        <code className="rounded bg-muted/80 px-2 py-0.5 text-xs font-mono">/{w.slug}</code>
                      </TableCell>
                      <TableCell className="align-middle">{statusPill(w.status)}</TableCell>
                      <TableCell className="pr-6 text-right align-middle">
                        <span className="font-mono text-[11px] text-muted-foreground">{w.id}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed border-border/80 bg-muted/10 shadow-sm">
          <CardHeader className="space-y-1 px-6 pb-2 pt-5">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Plus className="h-4 w-4 text-muted-foreground" aria-hidden />
              {t("Add website")}
            </CardTitle>
            <CardDescription>{t("Choose a store name and a short URL handle (letters, numbers, hyphens).")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-6 pb-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sf-new-site-name" className="text-xs font-medium text-muted-foreground">
                  {t("Store name")}
                </Label>
                <Input
                  id="sf-new-site-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("e.g. My Store")}
                  className="h-10 bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sf-new-site-slug" className="text-xs font-medium text-muted-foreground">
                  {t("URL handle")}
                </Label>
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-xs text-muted-foreground">
                    /shop/
                  </span>
                  <Input
                    id="sf-new-site-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder={t("my-store")}
                    className="h-10 rounded-l-none border-l-0 bg-background font-mono text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                className="min-w-[140px]"
                disabled={loading || !name.trim() || !slug.trim()}
                onClick={onCreateWebsite}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : t("Create website")}
              </Button>
              <p className="text-xs text-muted-foreground">{t("You can connect domains after the website is created.")}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator className="bg-border/60" />

      {/* Domains */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{t("Domains")}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("Hostnames must be unique across the platform. The primary domain is used for the public shop on that hostname (e.g. phillywaterice.com).")}
          </p>
        </div>

        <Card className="border-sky-200/80 bg-sky-50/50 shadow-sm dark:border-sky-900/50 dark:bg-sky-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Globe className="h-4 w-4 text-sky-700 dark:text-sky-400" aria-hidden />
              {t("GoDaddy DNS (custom domain)")}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t("After you add the domain here, point DNS at your Paper Flight server so visitors see your shop.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pb-5 text-sm text-muted-foreground">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                {t("In GoDaddy → DNS for your domain, add a record:")}
                <ul className="mt-2 list-disc space-y-1 pl-4 font-mono text-xs text-foreground">
                  <li>
                    <strong>{t("A")}</strong> @ → {t("your server IP")} ({t("or use forwarding below")})
                  </li>
                  <li>
                    <strong>{t("CNAME")}</strong> www → <span className="text-brand">nextjs.paperflight.cc</span>
                  </li>
                </ul>
              </li>
              <li>
                <strong>{t("Do not use GoDaddy Forwarding")}</strong>{" "}
                {t("to nextjs.paperflight.cc/shop — that redirects visitors away from phillywaterice.com. Use DNS A/CNAME only.")}
              </li>
              <li>
                {t("Add both phillywaterice.com and www.phillywaterice.com in the domain list above (two rows).")}
              </li>
              <li>{t("Set website status to Active and domain status to Active / Primary.")}</li>
            </ol>
            <p className="text-xs">
              {t("Production host")}: <span className="font-mono text-foreground">nextjs.paperflight.cc</span>
              {t(" — SSL must cover your custom domain on the server.")}
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/80 shadow-sm">
          <CardHeader className="border-b bg-muted/30 px-6 py-4">
            <CardTitle className="text-base font-semibold">{t("Connect domain")}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {t("Pick which website this hostname should serve, then add the domain.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 py-6">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-end">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">{t("Website")}</Label>
                <Select
                  value={domainWebsiteId || undefined}
                  onValueChange={(v) => setDomainWebsiteId(v)}
                  disabled={websites.length === 0}
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder={t("Select a website")} />
                  </SelectTrigger>
                  <SelectContent>
                    {websites.map((w) => (
                      <SelectItem key={w.id} value={w.id} textValue={`${w.name} ${w.slug}`}>
                        <span className="font-medium">{w.name}</span>
                        <span className="text-muted-foreground"> · /{w.slug}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSite ? (
                  <p className="text-xs text-muted-foreground">
                    {t("Selected")}: <span className="font-mono">{selectedSite.id}</span>
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sf-domain-host" className="text-xs font-medium text-muted-foreground">
                  {t("Domain")}
                </Label>
                <Input
                  id="sf-domain-host"
                  value={domainHostname}
                  onChange={(e) => setDomainHostname(e.target.value)}
                  placeholder={t("phillywaterice.com")}
                  className="h-10 bg-background font-mono text-sm"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={loading || !domainWebsiteId.trim() || !domainHostname.trim()}
                onClick={onAddDomain}
                className="gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {t("Add domain")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-border/80 bg-background"
                onClick={onReloadDomains}
                disabled={loading || !domainWebsiteId.trim()}
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                {t("Reload domains")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/80 shadow-sm">
          <CardHeader className="border-b bg-muted/30 px-6 py-4">
            <CardTitle className="text-base font-semibold">{t("Domain list")}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {!domainWebsiteId.trim()
                ? t("Select a website to load its domains.")
                : t("Domains connected to the selected website.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {domains.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                {domainWebsiteId.trim()
                  ? t("No domains for this website yet.")
                  : t("Choose a website above to see domains.")}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b hover:bg-transparent">
                    <TableHead className="h-10 pl-6 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("Hostname")}
                    </TableHead>
                    <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("Status")}
                    </TableHead>
                    <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("Type")}
                    </TableHead>
                    <TableHead className="h-10 pr-6 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("Actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.map((d) => (
                    <TableRow key={d.id} className="border-border/60 hover:bg-muted/20">
                      <TableCell className="pl-6 align-middle">
                        <span className="font-mono text-sm font-medium">{d.hostname}</span>
                      </TableCell>
                      <TableCell className="align-middle">{statusPill(d.status)}</TableCell>
                      <TableCell className="align-middle">
                        {d.isPrimary ? (
                          <Badge className="font-normal">{t("Primary")}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t("Secondary")}</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-6 text-right align-middle">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => onRemoveDomain(d.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          {t("Remove")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
