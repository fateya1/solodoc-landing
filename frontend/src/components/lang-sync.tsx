"use client";
import { useEffect } from "react";
import { useLanguageStore } from "@/store/language";

const LANG_MAP = { en: "en", sw: "sw", fr: "fr" } as const;

export function LangSync() {
  const locale = useLanguageStore((s) => s.locale);
  useEffect(() => {
    document.documentElement.lang = LANG_MAP[locale];
  }, [locale]);
  return null;
}
