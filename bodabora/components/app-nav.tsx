"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./ui";

const links = [
  { href: "/rider", label: "Rider app" },
  { href: "/sacco", label: "SACCO" },
  { href: "/insurer", label: "Insurer" },
  { href: "/ussd", label: "USSD" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="flex gap-1 overflow-x-auto text-sm">
          {links.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 font-medium transition-colors ${
                  active ? "bg-ink text-white" : "text-muted hover:bg-black/5 hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
