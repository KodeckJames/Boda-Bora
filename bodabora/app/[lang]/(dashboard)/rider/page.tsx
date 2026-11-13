import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading, loadOr } from "@/components/api-problem";
import { PhoneFrame } from "@/components/phone-frame";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { SubScoreBars } from "@/components/score-parts";
import { Card, CardTitle, ScoreGauge, Sparkline, scoreTone } from "@/components/ui";
import { api, getMe, needsRiderProfile } from "@/lib/api/server";
import type { CoachingMessage, Consent, Insurer, Me, RiderQuote, RiderScore, RiderWeek, TripSummary } from "@/lib/api/types";
import { dayLabel, km, minutesBetween, pct, timeOf } from "@/lib/format";
import { format, withLocale, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { getDictionary, getI18n } from "@/lib/i18n/server";
import { InsuranceCard } from "./insurance-card";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).rider.metaTitle };
}

async function loadRider(me: Me, locale: Locale) {
  const id = me.rider!.id;
  const [score, coaching, trips, insurers, consents, quotes] = await Promise.all([
    api<RiderScore>(`/api/riders/${id}/score`),
    api<{ latest: CoachingMessage | null }>(`/api/coaching/me?lang=${locale}`),
    api<TripSummary[]>(`/api/riders/${id}/trips?limit=4`),
    api<Insurer[]>("/api/insurer"),
    api<Consent[]>("/api/me/consents"),
    api<RiderQuote[]>("/api/me/quotes"),
  ]);
  // The latest scored week, for trips, distance and night share.
  const week = score.current ? await api<RiderWeek>(`/api/riders/${id}/week?week=${score.current.week_start}`) : null;
  return { score, coaching: coaching.latest, trips, insurers, consents, quotes, week };
}

// For SACCO officials, insurers and admins who open the rider app.
function NotARider({ locale, t }: { locale: Locale; t: Dictionary }) {
  return (
    <Card>
      <p className="font-semibold">{t.app.notRiderTitle}</p>
      <p className="mt-1 text-sm text-muted">{t.app.notRiderBody}</p>
      <Link href={withLocale(locale, "/start")} className="mt-4 inline-block text-sm font-semibold hover:underline">
        {t.app.myHome}
      </Link>
    </Card>
  );
}

async function RiderHome({ locale }: { locale: Locale }) {
  const { t } = await getI18n();
  const r = t.rider;
  const here = withLocale(locale, "/rider");
  const meResult = await loadOr(getMe, { locale, t, next: here });
  if (!meResult.ok) return meResult.problem;
  const me = meResult.data;
  // SACCO officials and insurers aren't riders. Admins can be: they set up a profile like anyone.
  if (!me.rider && (me.profile.role === "sacco_admin" || me.profile.role === "insurer_analyst")) return <NotARider locale={locale} t={t} />;
  if (needsRiderProfile(me)) redirect(withLocale(locale, "/onboarding"));

  const result = await loadOr(() => loadRider(me, locale), { locale, t, next: here });
  if (!result.ok) return result.problem;
  const { score, coaching, trips, insurers, consents, quotes, week } = result.data;
  const rider = me.rider!;
  const current = score.current;
  const trend = score.history.map((h) => Math.round(h.score));
  const nightShare = week && week.trips.length ? week.trips.reduce((s, tr) => s + tr.night_m, 0) / Math.max(1, week.trips.reduce((s, tr) => s + tr.distance_m, 0)) : null;
  const confidence = pct(current?.confidence);

  return (
    <div className="grid gap-10 lg:grid-cols-[400px_1fr]">
      <PhoneFrame>
        <div className="space-y-4 px-4 pb-6 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">{r.hello}</p>
              <p className="font-semibold">{rider.name.split(" ")[0]}</p>
            </div>
            <Link href={withLocale(locale, "/rider/ride")} className="rounded-full bg-hivis px-4 py-2 text-sm font-bold text-ink">
              {r.startShift}
            </Link>
          </div>

          <InstallPrompt />

          <div className="rounded-2xl bg-surface p-4 shadow-sm">
            {current ? (
              <>
                <div className="flex justify-center">
                  <ScoreGauge score={Math.round(current.score)} size={200} label={t.common.riderSafetyScore} riskLabels={t.common.risk} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs">
                  <span className="text-muted">
                    {r.thisWeek}{" "}
                    {current.delta !== null && (
                      <span className={current.delta >= 0 ? "text-safe" : "text-danger"}>
                        {current.delta >= 0 ? "▲" : "▼"} {Math.abs(Math.round(current.delta))}
                      </span>
                    )}
                  </span>
                  <span className="text-muted">
                    {r.confidence} <span className="font-semibold text-foreground">{confidence}%</span>
                  </span>
                </div>
              </>
            ) : (
              <div className="py-6 text-center">
                <p className="font-semibold">{r.noScoreTitle}</p>
                <p className="mt-1 text-sm text-muted">{r.noScoreBody}</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-hivis/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8a6400]">{r.weeklyAdvice}</p>
            <p className="mt-1.5 text-sm leading-relaxed">{coaching?.message ?? r.noCoaching}</p>
            {coaching?.focus && <p className="mt-2 text-xs font-medium text-[#8a6400]">📍 {coaching.focus}</p>}
          </div>

          {current && (
            <div className="rounded-2xl bg-surface p-4 shadow-sm">
              <SubScoreBars scores={current} t={t} />
            </div>
          )}

          <div className="rounded-2xl bg-surface p-4 shadow-sm">
            <p className="mb-2 text-sm font-semibold">{r.recentTrips}</p>
            {trips.length === 0 ? (
              <p className="text-sm text-muted">{r.noTrips}</p>
            ) : (
              <ul className="divide-y divide-line">
                {trips.map((trip) => (
                  <li key={trip.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium">
                        {dayLabel(trip.started_at, locale, t.common)} · {timeOf(trip.started_at, locale)}
                      </p>
                      <p className="text-xs text-muted">
                        {km(trip.distance_m)} km · {minutesBetween(trip.started_at, trip.ended_at)} min
                        {trip.events > 0 ? ` · ${format(r.tripEvents, { n: trip.events })}` : ""}
                      </p>
                    </div>
                    {trip.score !== null && <span className={`tabular font-semibold ${scoreTone(trip.score).text}`}>{Math.round(trip.score)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </PhoneFrame>

      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{r.eyebrow}</p>
            <h1 className="text-3xl font-bold tracking-tight">{rider.name}</h1>
            <p className="mt-1 text-muted">
              <span className="font-mono font-semibold text-foreground">{rider.bike_reg}</span> · {rider.phone}
            </p>
          </div>
          <Link href={withLocale(locale, "/onboarding")} className="text-sm font-semibold hover:underline">
            {r.editProfile}
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardTitle>{r.trendTitle}</CardTitle>
            {current && trend.length > 1 ? (
              <div className="flex items-end justify-between">
                <span className="tabular text-3xl font-bold">{Math.round(current.score)}</span>
                <Sparkline values={trend} width={160} height={44} stroke={scoreTone(current.score).stroke} />
              </div>
            ) : (
              <p className="text-sm text-muted">{r.trendEmpty}</p>
            )}
          </Card>
          <Card>
            <CardTitle>{r.thisWeek}</CardTitle>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="text-xs text-muted">{r.trips}</dt>
                <dd className="tabular text-xl font-bold">{week?.score?.trip_count ?? week?.trips.length ?? 0}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{r.km}</dt>
                <dd className="tabular text-xl font-bold">{Math.round(week?.score?.distance_km ?? 0)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{r.night}</dt>
                <dd className="tabular text-xl font-bold">{nightShare === null ? "—" : `${Math.round(nightShare * 100)}%`}</dd>
              </div>
            </dl>
          </Card>
        </div>

        {coaching?.focus && (
          <Card>
            <CardTitle>{r.whyTitle}</CardTitle>
            <p className="text-sm text-muted">{r.whyBody}</p>
            <p className="mt-2 text-sm font-medium">📍 {coaching.focus}</p>
          </Card>
        )}

        <InsuranceCard insurers={insurers} consents={consents} quotes={quotes} confidence={current?.confidence ?? null} locale={locale} t={t} />

        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={withLocale(locale, "/rider/week")} className="rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-ink">
            <p className="font-semibold">{r.weekLink}</p>
            <p className="mt-1 text-sm text-muted">{r.weekLinkBody}</p>
          </Link>
          <Link href={withLocale(locale, "/rider/live")} className="rounded-2xl bg-ink p-5 text-white transition-colors hover:bg-ink/90">
            <p className="font-semibold">{r.liveLink}</p>
            <p className="mt-1 text-sm text-white/70">{r.liveLinkBody}</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function RiderAppPage() {
  const { locale } = await getI18n();
  return (
    <Suspense fallback={<Loading className="h-[640px]" />}>
      <RiderHome locale={locale} />
    </Suspense>
  );
}
