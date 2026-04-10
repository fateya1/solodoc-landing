import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "en" | "sw" | "fr";

interface LanguageStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale) => set({ locale }),
    }),
    { name: "solodoc-language" }
  )
);
