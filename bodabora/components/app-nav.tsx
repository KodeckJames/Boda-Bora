"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { withLocale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./ui";

const links = [
  { path: "/rider", key: "rider" },
  { path: "/sacco", key: "sacco" },
  { path: "/insurer", key: "insurer" },
  { path: "/ussd", key: "ussd" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const { locale, t } = useI18n();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo href={withLocale(locale, "/")} />
        <div className="flex min-w-0 items-center gap-2">
          <nav className="flex gap-1 overflow-x-auto text-sm">
            {links.map((l) => {
              const href = withLocale(locale, l.path);
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={l.path}
                  href={href}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 font-medium transition-colors ${
                    active ? "bg-ink text-white" : "text-muted hover:bg-black/5 hover:text-foreground"
                  }`}
                >
                  {t.nav[l.key]}
                </Link>
              );
            })}
          </nav>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
