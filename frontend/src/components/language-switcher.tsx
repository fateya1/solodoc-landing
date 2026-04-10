"use client";
import { useLanguageStore, type Locale } from "@/store/language";

const LANGUAGES: { locale: Locale; flag: string; label: string; short: string }[] = [
  { locale: "en", flag: "🇬🇧", label: "English", short: "EN" },
  { locale: "sw", flag: "🇰🇪", label: "Kiswahili", short: "SW" },
  { locale: "fr", flag: "🇫🇷", label: "Français", short: "FR" },
];

interface Props {
  /** "flags" shows flag + short code, "full" shows flag + full name */
  variant?: "flags" | "full" | "dropdown";
  className?: string;
}

export function LanguageSwitcher({ variant = "flags", className = "" }: Props) {
  const { locale, setLocale } = useLanguageStore();

  if (variant === "dropdown") {
    return (
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className={`text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-300 cursor-pointer ${className}`}
        aria-label="Select language"
      >
        {LANGUAGES.map((l) => (
          <option key={l.locale} value={l.locale}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`} role="group" aria-label="Language selection">
      {LANGUAGES.map((l) => {
        const active = locale === l.locale;
        return (
          <button
            key={l.locale}
            onClick={() => setLocale(l.locale)}
            title={l.label}
            aria-pressed={active}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all touch-manipulation ${
              active
                ? "bg-brand-600 text-white font-medium shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span className="text-sm leading-none">{l.flag}</span>
            {variant === "full" ? (
              <span className="hidden sm:inline">{l.label}</span>
            ) : (
              <span>{l.short}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
