"use client";
import { useLanguageStore } from "@/store/language";
import { translations } from "./translations";

type Section = keyof typeof translations.en;
type Keys<S extends Section> = keyof typeof translations.en[S];

/**
 * useT() returns a typed translation function.
 * Supports flat keys including dynamic ones like t("appointment", `status${status}`)
 */
export function useT() {
  const locale = useLanguageStore((s) => s.locale);

  function t<S extends Section>(section: S, key: Keys<S> | string): string {
    const localeData = (translations[locale] as any);
    const fallback = (translations.en as any);
    const val = localeData?.[section]?.[key as string];
    if (val !== undefined && val !== null) return String(val);
    const fallbackVal = fallback?.[section]?.[key as string];
    if (fallbackVal !== undefined && fallbackVal !== null) return String(fallbackVal);
    return String(key);
  }

  return t;
}
