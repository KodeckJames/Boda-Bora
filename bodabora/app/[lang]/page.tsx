import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button, Logo, ScoreBar, ScoreGauge } from "@/components/ui";
import { privacyPolicy } from "@/lib/legal/privacy";
import { termsOfService } from "@/lib/legal/terms";
import { withLocale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { coachingMessage, currentRider } from "@/lib/mock-data";

export default async function Home() {
  const { locale, t } = await getI18n();
  const l = t.landing;
  const href = (path: string) => withLocale(locale, path);
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <header className="flex h-16 items-center justify-between gap-3">
            <Logo dark href={href("/")} />
            <div className="flex items-center gap-6">
              <nav className="hidden gap-6 text-sm text-white/70 sm:flex">
                <Link href={href("/rider")} className="hover:text-white">{t.nav.riders}</Link>
                <Link href={href("/sacco")} className="hover:text-white">{t.nav.saccos}</Link>
                <Link href={href("/insurer")} className="hover:text-white">{t.nav.insurers}</Link>
                <Link href={href("/ussd")} className="hover:text-white">{t.nav.ussd}</Link>
              </nav>
              <LanguageSwitcher dark />
            </div>
          </header>

          <div className="grid items-center gap-12 py-16 lg:grid-cols-[1.2fr_1fr] lg:py-24">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/70">
                {l.theme}
              </p>
              <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
                {l.heroBefore} <span className="text-hivis">{l.heroHighlight}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-white/70">{l.heroBody}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href={href("/rider")} variant="hivis">{l.ctaRider}</Button>
                <Link
                  href={href("/rider/live")}
                  className="inline-flex h-10 items-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white hover:bg-white/10"
                >
                  {l.ctaLive}
                </Link>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 text-foreground shadow-2xl">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold">{currentRider.name}</span>
                <span className="text-muted">{currentRider.stage}</span>
              </div>
              <div className="flex justify-center py-2">
                <ScoreGauge score={currentRider.score} label={t.common.riderSafetyScore} riskLabels={t.common.risk} />
              </div>
              <div className="mt-4 space-y-3">
                {(["braking", "cornering", "nightExposure"] as const).map((k) => (
                  <ScoreBar key={k} label={t.common.subScores[k]} value={currentRider.subScores[k]} />
                ))}
              </div>
              <div className="mt-5 rounded-xl bg-hivis/15 p-3 text-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#8a6400]">{l.weeklyAdvice}</p>
                <p className="line-clamp-3">{coachingMessage[locale]}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:grid-cols-3 sm:px-6">
          {l.stats.map((s) => (
            <div key={s.value}>
              <p className="tabular text-4xl font-bold tracking-tight">{s.value}</p>
              <p className="mt-2 text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight">{l.pillarsTitle}</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {l.pillars.map((p) => (
            <div key={p.title} className="rounded-2xl border border-line bg-surface p-6">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="mt-2 text-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">{l.howTitle}</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {l.steps.map((s, i) => (
              <div key={s.title} className="border-t-2 border-hivis pt-4">
                <span className="font-mono text-sm text-muted">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Buyers */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <Link href={href("/sacco")} className="group rounded-3xl bg-ink p-8 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-hivis">{l.sacco.eyebrow}</p>
            <h3 className="mt-3 text-2xl font-bold">{l.sacco.title}</h3>
            <p className="mt-3 text-white/70">{l.sacco.body}</p>
            <span className="mt-6 inline-block text-sm font-semibold text-hivis group-hover:underline">{l.sacco.cta}</span>
          </Link>
          <Link href={href("/insurer")} className="group rounded-3xl bg-hivis p-8 text-ink">
            <p className="text-xs font-semibold uppercase tracking-wider">{l.insurer.eyebrow}</p>
            <h3 className="mt-3 text-2xl font-bold">{l.insurer.title}</h3>
            <p className="mt-3 text-ink/70">{l.insurer.body}</p>
            <span className="mt-6 inline-block text-sm font-semibold group-hover:underline">{l.insurer.cta}</span>
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:justify-between sm:px-6">
          <span>{l.footerLeft}</span>
          <span>{l.footerRight}</span>
          <span className="flex gap-4">
            <Link href={href("/privacy")} className="hover:text-foreground">{privacyPolicy[locale].title}</Link>
            <Link href={href("/terms")} className="hover:text-foreground">{termsOfService[locale].title}</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
