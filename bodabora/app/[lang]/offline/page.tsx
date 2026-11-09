import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui";
import { withLocale } from "@/lib/i18n/config";
import { getDictionary, getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).offline.metaTitle };
}

// Served by the service worker when a page isn't cached and there's no network.
export default async function OfflinePage() {
  const { locale, t } = await getI18n();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-ink px-6 text-center text-white">
      <Logo dark href={withLocale(locale, "/")} />
      <h1 className="text-2xl font-bold">{t.offline.title}</h1>
      <p className="max-w-xs text-white/70">{t.offline.body}</p>
      <Link href={withLocale(locale, "/rider/ride")} className="rounded-full bg-hivis px-5 py-2.5 text-sm font-semibold text-ink">
        {t.offline.cta}
      </Link>
    </main>
  );
}
