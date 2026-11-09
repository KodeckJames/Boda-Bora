"use client";

import { usePathname, useRouter } from "next/navigation";
import { LOCALE_COOKIE, locales, switchLocalePath, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

// Saved for a year; proxy.ts reads it to pick the language of unprefixed URLs like /rider.
function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

// EN | SW toggle. Remembers the choice in a cookie (read by proxy.ts for unprefixed URLs)
// and swaps the locale segment of the current URL.
export function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  function choose(next: Locale) {
    if (next === locale) return;
    rememberLocale(next);
    router.replace(switchLocalePath(pathname, next));
  }

  return (
    <div
      role="group"
      aria-label={t.common.language}
      className={`flex shrink-0 rounded-full p-0.5 text-xs font-semibold ${dark ? "bg-white/10" : "bg-black/5"}`}
    >
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          title={t.common.languages[l]}
          onClick={() => choose(l)}
          className={`rounded-full px-2.5 py-1 uppercase transition-colors ${
            l === locale
              ? dark
                ? "bg-hivis text-ink"
                : "bg-ink text-white"
              : dark
                ? "text-white/70 hover:text-white"
                : "text-muted hover:text-foreground"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
