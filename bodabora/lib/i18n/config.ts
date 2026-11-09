// Supported languages. The URL carries the locale (/en/..., /sw/...); proxy.ts picks one
// for unprefixed URLs from the saved choice (cookie) or the browser's language.
export const locales = ["en", "sw"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const hasLocale = (value: string): value is Locale => (locales as readonly string[]).includes(value);

// Prefixes an app path with the locale: withLocale("sw", "/rider") → "/sw/rider".
export const withLocale = (locale: Locale, path: string) => `/${locale}${path === "/" ? "" : path}`;

// Swaps the locale segment of the current path: "/en/rider/week" → "/sw/rider/week".
export const switchLocalePath = (pathname: string, to: Locale) => {
  const [, first, ...rest] = pathname.split("/");
  const tail = first && hasLocale(first) ? rest : [first, ...rest].filter(Boolean);
  return `/${to}${tail.length ? `/${tail.join("/")}` : ""}`;
};

// "Hello {name}" + { name: "Kevin" } → "Hello Kevin"
export const format = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
