"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { withLocale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

// Pages the service worker cached while signed in; dropped on sign-out so a shared phone
// doesn't show the last rider's scores offline.
async function clearCachedPages() {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k.startsWith("shell-")).map((k) => caches.delete(k)));
}

// Signed in: avatar with name, email and sign-out. Signed out: a "Sign in" link.
export function UserMenu({ dark = false }: { dark?: boolean }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (isPending) return <span className={`h-8 w-8 shrink-0 rounded-full ${dark ? "bg-white/10" : "bg-black/5"}`} />;

  const user = session?.user;
  if (!user) {
    return (
      <Link
        href={`${withLocale(locale, "/sign-in")}?next=${encodeURIComponent(pathname)}`}
        className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${
          dark ? "bg-hivis text-ink" : "bg-ink text-white"
        }`}
      >
        {t.auth.signIn}
      </Link>
    );
  }

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    await clearCachedPages().catch(() => {});
    setOpen(false);
    setSigningOut(false);
    router.replace(withLocale(locale, "/"));
    router.refresh();
  }

  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label={t.auth.account}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-hivis text-sm font-bold text-ink ring-offset-2 focus-visible:ring-2 focus-visible:ring-hivis"
      >
        {user.image ? (
          // Google profile photo; plain <img> since it's a tiny external avatar.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-30 w-60 rounded-2xl border border-line bg-white p-2 text-foreground shadow-xl"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={signingOut}
            className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-black/5 disabled:opacity-60"
          >
            {t.auth.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
