import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading, loadOr } from "@/components/api-problem";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/ui";
import { UserMenu } from "@/components/user-menu";
import { getMe } from "@/lib/api/server";
import { format, withLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary, getI18n } from "@/lib/i18n/server";
import { OnboardingForm } from "./onboarding-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).onboarding.metaTitle, robots: { index: false } };
}

async function Form({ locale }: { locale: Locale }) {
  const { t } = await getI18n();
  const result = await loadOr(getMe, { locale, t, next: withLocale(locale, "/onboarding") });
  if (!result.ok) return result.problem;
  const me = result.data;
  // SACCO officials and insurers don't have a rider profile.
  if (me.profile.role === "sacco_admin" || me.profile.role === "admin") redirect(withLocale(locale, "/sacco"));
  if (me.profile.role === "insurer_analyst") redirect(withLocale(locale, "/insurer"));
  const o = t.onboarding;
  return (
    <>
      <OnboardingForm
        lang={locale}
        editing={!!me.rider}
        defaults={{
          name: me.rider?.name ?? me.profile.name ?? "",
          bike_reg: me.rider?.bike_reg ?? "",
          phone: me.rider?.phone ?? "",
        }}
      />
      {!me.rider && (
        <p className="mt-6 rounded-2xl bg-black/4 p-4 text-sm text-muted">
          {format(o.staffNote, { email: me.profile.email ?? "" })}
        </p>
      )}
    </>
  );
}

// After the first Google sign-in: the rider's full name and number plate become their identity
// on SACCO rosters and insurer quotes. Also where riders correct them later.
export default async function OnboardingPage() {
  const { locale, t } = await getI18n();
  const o = t.onboarding;
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo href={withLocale(locale, "/")} />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{o.eyebrow}</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{o.title}</h1>
        <p className="mt-2 text-muted">{o.body}</p>
        <div className="mt-8">
          <Suspense fallback={<Loading className="h-80" />}>
            <Form locale={locale} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
