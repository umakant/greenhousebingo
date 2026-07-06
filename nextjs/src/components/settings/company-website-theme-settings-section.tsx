"use client";



import * as React from "react";

import Link from "next/link";

import { ExternalLink, Globe, Lock, Paintbrush } from "lucide-react";

import { toast } from "sonner";



import {

  CompanyThemePicker,

  CompanyWebsiteThemePreviewPanel,

  type CompanyThemeOption,

} from "@/components/settings/company-theme-picker";

import { SettingsSectionShell } from "@/components/settings/settings-section-layout";

import { Button, buttonVariants } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";

import { cn } from "@/lib/utils";

import { resolveCompanyPublicSiteHref } from "@/lib/website-url";



type Props = {

  canEdit: boolean;

  initial: Record<string, string>;

  onFlash: (v: { type: "success" | "error"; message: string } | null) => void;

};



function isEnabled(value: string | undefined): boolean {

  const v = (value ?? "").trim().toLowerCase();

  return v === "1" || v === "true" || v === "yes" || v === "on";

}



async function saveCompanyWebsiteTheme(settings: Record<string, string>) {

  const res = await fetch("/api/settings", {

    method: "POST",

    headers: { "content-type": "application/json" },

    body: JSON.stringify({

      section: "company-website-theme",

      settings,

    }),

  });

  const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

  if (!res.ok || !data?.ok) {

    throw new Error(data?.message || "Failed to save company website theme.");

  }

}



export function CompanyWebsiteThemeSettingsSection({ canEdit, initial, onFlash }: Props) {

  const [saving, setSaving] = React.useState(false);

  const [slug, setSlug] = React.useState(initial.companyNextjsThemeSlug ?? "");

  const [passwordProtected, setPasswordProtected] = React.useState(

    isEnabled(initial.companyWebsitePasswordProtected),

  );

  const [accessPassword, setAccessPassword] = React.useState("");

  const [themes, setThemes] = React.useState<CompanyThemeOption[]>([]);

  const [loadingThemes, setLoadingThemes] = React.useState(true);

  const [hasAccessPassword, setHasAccessPassword] = React.useState(
    isEnabled(initial.companyWebsiteHasAccessPassword),
  );



  React.useEffect(() => {

    void (async () => {

      setLoadingThemes(true);

      try {

        const res = await fetch("/api/company-themes", { credentials: "include" });

        const data = await res.json();

        if (data?.ok && Array.isArray(data.themes)) {

          setThemes(data.themes as CompanyThemeOption[]);

        }

      } finally {

        setLoadingThemes(false);

      }

    })();

  }, []);



  const publicSiteHref = resolveCompanyPublicSiteHref({

    company_slug: initial.company_slug,

    companyWebsite: initial.companyWebsite,

  });



  const save = async () => {

    if (passwordProtected && !hasAccessPassword && !accessPassword.trim()) {

      onFlash({ type: "error", message: "Set an access password before enabling password protection." });

      toast.error("Set an access password before enabling password protection.");

      return;

    }



    setSaving(true);

    onFlash(null);

    try {

      await saveCompanyWebsiteTheme({

        companyNextjsThemeSlug: slug,

        companyWebsitePasswordProtected: passwordProtected ? "1" : "0",

        companyWebsiteAccessPassword: accessPassword,

      });

      onFlash({ type: "success", message: "Company website theme saved." });

      toast.success("Company website theme saved.");

      if (accessPassword.trim()) {
        setHasAccessPassword(true);
      }

      setAccessPassword("");

      window.dispatchEvent(new Event("pf:app-settings-updated"));

    } catch (e: unknown) {

      const message = e instanceof Error ? e.message : "Failed to save company website theme.";

      onFlash({ type: "error", message });

      toast.error(message);

    } finally {

      setSaving(false);

    }

  };



  return (

    <SettingsSectionShell

      title="Company Website Theme"

      description="Choose a marketing theme for your company’s public website. Optionally restrict the site with an access password for invited visitors only."

      icon={Globe}

      canEdit={canEdit}

      onSave={save}

      saving={saving}

      actions={

        canEdit ? (

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">

            {slug ? (

              <>

                <Link

                  href="/settings/company-website-theme/customize"

                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}

                >

                  <Paintbrush className="h-3.5 w-3.5" />

                  Customize

                </Link>

                <a

                  href={publicSiteHref}

                  target="_blank"

                  rel="noopener noreferrer"

                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}

                >

                  Preview site

                  <ExternalLink className="h-3.5 w-3.5" />

                </a>

              </>

            ) : null}

            <Button onClick={() => void save()} disabled={saving} size="sm" className="w-full sm:w-auto">

              {saving ? "Saving..." : "Save Changes"}

            </Button>

          </div>

        ) : undefined

      }

    >

      <div className="mb-6 rounded-xl border bg-card p-4 sm:p-5">

        <div className="flex items-start justify-between gap-4">

          <div className="flex gap-3">

            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted">

              <Lock className="h-4 w-4 text-muted-foreground" />

            </span>

            <div>

              <Label htmlFor="company-website-password-protected" className="text-base font-medium">

                Password protect site

              </Label>

              <p className="mt-1 text-sm text-muted-foreground">

                When enabled, visitors must enter your access password before viewing{" "}

                <code className="rounded bg-muted px-1 py-0.5 text-xs">{publicSiteHref}</code>. Logged-in

                company users can still preview without the password.

              </p>

            </div>

          </div>

          <Switch

            id="company-website-password-protected"

            checked={passwordProtected}

            onCheckedChange={setPasswordProtected}

            disabled={!canEdit}

          />

        </div>



        {passwordProtected ? (

          <div className="mt-5 max-w-md space-y-2 border-t pt-5">

            <Label htmlFor="company-website-access-password">Access password</Label>

            <Input

              id="company-website-access-password"

              type="password"

              autoComplete="new-password"

              disabled={!canEdit}

              value={accessPassword}

              onChange={(e) => setAccessPassword(e.target.value)}

              placeholder={hasAccessPassword ? "Leave blank to keep current password" : "Set access password"}

            />

            <p className="text-xs text-muted-foreground">

              Share this password only with people who should view your marketing site.

            </p>

          </div>

        ) : null}

      </div>



      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        <div className="lg:col-span-2">

          <CompanyThemePicker

            value={slug}

            disabled={!canEdit}

            onChange={setSlug}

            embedded

            publicSiteHref={publicSiteHref}

          />

        </div>

        <div className="lg:col-span-1">

          <CompanyWebsiteThemePreviewPanel slug={slug} themes={themes} loading={loadingThemes} />

        </div>

      </div>

    </SettingsSectionShell>

  );

}


