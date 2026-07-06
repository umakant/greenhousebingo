"use client";

import * as React from "react";

export type FormDisplaySettings = {
  dateFormat: string;
  calendarStartDay: string;
};

const FormDisplaySettingsContext = React.createContext<FormDisplaySettings | null>(null);

export function FormDisplaySettingsProvider({
  value,
  children,
}: {
  value: FormDisplaySettings;
  children: React.ReactNode;
}) {
  return (
    <FormDisplaySettingsContext.Provider value={value}>{children}</FormDisplaySettingsContext.Provider>
  );
}

/** Public forms pass server-loaded prefs; authenticated app pages omit and use AppSettings instead. */
export function useFormDisplaySettingsOptional(): FormDisplaySettings | null {
  return React.useContext(FormDisplaySettingsContext);
}
