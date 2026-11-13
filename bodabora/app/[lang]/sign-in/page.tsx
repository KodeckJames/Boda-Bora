import type { Metadata } from "next";
import { Suspense } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/ui";
import { withLocale } from "@/lib/i18n/config";
import { getDictionary, getI18n } from "@/lib/i18n/server";
import { GoogleSignIn } from "./google-sign-in";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).auth.metaTitle, robots: { index: false } };
}

// Google is the only way in, for riders, SACCO officials and insurers alike.
export default async function SignInPage() {
  const { locale, t } = await getI18n();
  return (
    <main className="flex flex-1 flex-col bg-ink text-white">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo dark href={withLocale(locale, "/")} />
        <LanguageSwitcher dark />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-foreground shadow-2xl">
          <h1 className="text-2xl font-bold tracking-tight">{t.auth.title}</h1>
          <p className="mt-2 text-muted">{t.auth.body}</p>
          <Suspense fallback={<div className="mt-8 h-12 rounded-full bg-black/5" />}>
            <GoogleSignIn />
          </Suspense>
          <p className="mt-6 text-xs text-muted">{t.auth.note}</p>
        </div>
      </div>
    </main>
  );
}
