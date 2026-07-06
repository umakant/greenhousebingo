/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import * as React from "react";
import { Languages, Plus, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/contexts/translation-context";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import {
  catalogCodeToLocale,
  getEnabledLanguageRows,
  languageCodesMatch,
  parseLanguageCatalogJson,
  type LanguageRow,
} from "@/lib/language-catalog";
import fallbackLanguages from "@/data/languages.json";
import { getCountryFlag } from "@/utils/languages";

function resolveSwitcherLanguages(catalogRaw: string | undefined): LanguageRow[] {
  const fromSettings = parseLanguageCatalogJson(catalogRaw);
  const catalog = fromSettings && fromSettings.length > 0 ? fromSettings : (fallbackLanguages as LanguageRow[]);
  return getEnabledLanguageRows(catalog);
}

export function LanguageSwitcher({
  compact = false,
  isSuperAdmin = false,
}: {
  compact?: boolean;
  isSuperAdmin?: boolean;
}) {
  const { locale, setLocale, t } = useTranslation();
  const appSettings = useAppSettingsOptional();
  const enabledLanguages = React.useMemo(
    () => resolveSwitcherLanguages(appSettings?.settings.language_catalog),
    [appSettings?.settings.language_catalog],
  );
  const currentLang =
    enabledLanguages.find((l) => languageCodesMatch(l.code, locale)) ?? enabledLanguages[0] ?? {
      code: "en",
      name: "English",
      countryCode: "GB",
    };

  const handleChange = (code: string) => {
    setLocale(catalogCodeToLocale(code));
  };

  if (!compact) {
    return (
      <div className="text-sm text-muted-foreground">
        {getCountryFlag(currentLang.countryCode)} {currentLang.name}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={t("Change Language")}
        >
          <Languages className="h-4 w-4" />
          <span className="sr-only">{t("Change Language")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {enabledLanguages.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => handleChange(l.code)}
            className={languageCodesMatch(locale, l.code) ? "bg-accent" : ""}
          >
            <span className="mr-2">{getCountryFlag(l.countryCode)}</span>
            {l.name}
          </DropdownMenuItem>
        ))}
        {isSuperAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/languages/new">
                <Plus className="h-4 w-4 mr-2" />
                {t("Create Language")}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/languages/manage">
                <Settings className="h-4 w-4 mr-2" />
                {t("Manage Languages")}
              </a>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
