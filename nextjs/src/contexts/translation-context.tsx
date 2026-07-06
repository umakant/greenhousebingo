"use client";

import * as React from "react";

import en from "@/locales/en.json";
import es from "@/locales/es.json";
import ar from "@/locales/ar.json";
import da from "@/locales/da.json";
import de from "@/locales/de.json";
import fr from "@/locales/fr.json";
import he from "@/locales/he.json";
import it from "@/locales/it.json";
import ja from "@/locales/ja.json";
import nl from "@/locales/nl.json";
import pl from "@/locales/pl.json";
import pt from "@/locales/pt.json";
import ptBR from "@/locales/pt-BR.json";
import ru from "@/locales/ru.json";
import tr from "@/locales/tr.json";
import zh from "@/locales/zh.json";

import { toTitleCaseUi } from "@/lib/to-title-case";

type Messages = Record<string, string>;

const messages: Record<string, Messages> = {
  en: en as Messages,
  es: es as Messages,
  ar: ar as Messages,
  da: da as Messages,
  de: de as Messages,
  fr: fr as Messages,
  he: he as Messages,
  it: it as Messages,
  ja: ja as Messages,
  nl: nl as Messages,
  pl: pl as Messages,
  pt: pt as Messages,
  "pt-BR": ptBR as Messages,
  ru: ru as Messages,
  tr: tr as Messages,
  zh: zh as Messages,
};

const defaultLocale = "en";
const fallbackMessages = messages[defaultLocale] ?? {};

const RTL_LOCALES = new Set(["ar", "he"]);

function getMessage(locale: string, key: string): string {
  const localeMessages = messages[locale] ?? fallbackMessages;
  const raw = (localeMessages[key] ?? fallbackMessages[key] ?? key) as string;
  if (locale !== "en") return raw;
  return toTitleCaseUi(raw);
}

type TranslationContextValue = {
  locale: string;
  setLocale: (code: string) => void;
  t: (key: string) => string;
};

const TranslationContext = React.createContext<TranslationContextValue | null>(null);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<string>(defaultLocale);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("pf_lang") : null;
    if (saved && messages[saved]) {
      setLocaleState(saved);
    }
    setMounted(true);
  }, []);

  const setLocale = React.useCallback((code: string) => {
    setLocaleState(code);
    if (typeof window !== "undefined") {
      localStorage.setItem("pf_lang", code);
      document.documentElement.lang = code;
      document.documentElement.dir = RTL_LOCALES.has(code) ? "rtl" : "ltr";
    }
  }, []);

  const t = React.useCallback(
    (key: string) => getMessage(mounted ? locale : defaultLocale, key),
    [locale, mounted],
  );

  const value = React.useMemo<TranslationContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const ctx = React.useContext(TranslationContext);
  if (!ctx) {
    return {
      locale: defaultLocale,
      setLocale: () => {},
      t: (key: string) => getMessage(defaultLocale, key),
    };
  }
  return ctx;
}
