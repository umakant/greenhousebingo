"use client";

import { TranslationProvider as Provider } from "@/contexts/translation-context";

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  return <Provider>{children}</Provider>;
}
