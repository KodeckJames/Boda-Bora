import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { loadOr } from "@/components/api-problem";
import { Logo } from "@/components/ui";
import { getMe, needsRiderProfile } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";
import { withLocale, type Locale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { robots: { index: false } };

// Where each user belongs after signing in.
function homeOf(me: Me): string {
  switch (me.profile.role) {
    case "sacco_admin":
    case "admin":
      return "/sacco";
    case "insurer_analyst":
      return "/insurer";
    default:
      return needsRiderProfile(me) ? "/onboarding" : "/rider";
  }
}

async function Route({ locale }: { locale: Locale }) {
  const { t } = await getI18n();
  const result = await loadOr(getMe, { locale, t, next: withLocale(locale, "/start") });
  if (!result.ok) return <div className="w-full max-w-md">{result.problem}</div>;
  redirect(withLocale(locale, homeOf(result.data)));
}

// Landing spot after Google sign-in: sends riders, SACCO officials and insurers to their own home,
// and new users to set up their rider profile.
export default async function StartPage() {
  const { locale, t } = await getI18n();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-ink px-4 text-white">
      <Logo dark href={withLocale(locale, "/")} />
      <Suspense fallback={<p className="text-white/70">{t.app.opening}</p>}>
        <Route locale={locale} />
      </Suspense>
    </main>
  );
}
