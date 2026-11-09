import type { Metadata } from "next";
import Link from "next/link";
import { PhoneFrame } from "@/components/phone-frame";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { Card, CardTitle, ScoreBar, ScoreGauge, Sparkline, scoreTone } from "@/components/ui";
import { withLocale } from "@/lib/i18n/config";
import { getDictionary, getI18n } from "@/lib/i18n/server";
import { coachingMessage, currentRider, recentTrips, type SubScores } from "@/lib/mock-data";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).rider.metaTitle };
}

export default async function RiderAppPage() {
  const { locale, t } = await getI18n();
  const r = t.rider;
  const rider = currentRider;
  return (
    <div className="grid gap-10 lg:grid-cols-[400px_1fr]">
      <PhoneFrame>
        <div className="space-y-4 px-4 pb-6 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">{r.hello}</p>
              <p className="font-semibold">{rider.name.split(" ")[0]}</p>
            </div>
            <Link
              href={withLocale(locale, "/rider/ride")}
              className="rounded-full bg-hivis px-4 py-2 text-sm font-bold text-ink"
            >
              {r.startShift}
            </Link>
          </div>

          <InstallPrompt />

          <div className="rounded-2xl bg-surface p-4 shadow-sm">
            <div className="flex justify-center">
              <ScoreGauge score={rider.score} size={200} label={t.common.riderSafetyScore} riskLabels={t.common.risk} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs">
              <span className="text-muted">
                {r.thisWeek}{" "}
                <span className={rider.scoreDelta >= 0 ? "text-safe" : "text-danger"}>
                  {rider.scoreDelta >= 0 ? "▲" : "▼"} {Math.abs(rider.scoreDelta)}
                </span>
              </span>
              <span className="text-muted">
                {r.confidence} <span className="font-semibold text-foreground">{rider.coverage}%</span>
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-hivis/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8a6400]">{r.weeklyAdvice}</p>
            <p className="mt-1.5 text-sm leading-relaxed">{coachingMessage[locale]}</p>
            <p className="mt-2 text-xs font-medium text-[#8a6400]">📍 {coachingMessage.focus}</p>
          </div>

          <div className="space-y-3 rounded-2xl bg-surface p-4 shadow-sm">
            {(Object.keys(rider.subScores) as (keyof SubScores)[]).map((k) => (
              <ScoreBar key={k} label={t.common.subScores[k]} value={rider.subScores[k]} />
            ))}
          </div>

          <div className="rounded-2xl bg-surface p-4 shadow-sm">
            <p className="mb-2 text-sm font-semibold">{r.recentTrips}</p>
            <ul className="divide-y divide-line">
              {recentTrips.slice(0, 4).map((trip) => (
                <li key={trip.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">{trip.from} → {trip.to}</p>
                    <p className="text-xs text-muted">{t.common[trip.day]} · {trip.start} · {trip.km} km</p>
                  </div>
                  <span className={`tabular font-semibold ${scoreTone(trip.score).text}`}>{trip.score}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-dashed border-line p-3 text-xs text-muted">
            <span>{r.batterySaver}</span>
            <span>{r.uploadOnWifi}</span>
          </div>
        </div>
      </PhoneFrame>

      <div className="space-y-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{r.eyebrow}</p>
          <h1 className="text-3xl font-bold tracking-tight">{r.title}</h1>
          <p className="mt-2 max-w-xl text-muted">{r.description}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardTitle>{r.trendTitle}</CardTitle>
            <div className="flex items-end justify-between">
              <span className="tabular text-3xl font-bold">{rider.score}</span>
              <Sparkline values={rider.trend} width={160} height={44} stroke={scoreTone(rider.score).stroke} />
            </div>
          </Card>
          <Card>
            <CardTitle>{r.thisWeek}</CardTitle>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="text-xs text-muted">{r.trips}</dt>
                <dd className="tabular text-xl font-bold">{rider.trips}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{r.km}</dt>
                <dd className="tabular text-xl font-bold">{rider.weeklyKm}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{r.night}</dt>
                <dd className="tabular text-xl font-bold">{rider.nightShare}%</dd>
              </div>
            </dl>
          </Card>
        </div>

        <Card>
          <CardTitle>{r.whyTitle}</CardTitle>
          <p className="text-sm text-muted">{r.whyBody}</p>
          <p className="mt-2 text-sm font-medium">📍 {coachingMessage.focus}</p>
        </Card>

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
