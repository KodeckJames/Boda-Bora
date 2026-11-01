import type { Metadata } from "next";
import Link from "next/link";
import { PhoneFrame } from "@/components/phone-frame";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { Badge, Card, CardTitle, ScoreBar, ScoreGauge, Sparkline, scoreTone } from "@/components/ui";
import { coachingMessage, currentRider, recentTrips, subScoreLabels, type SubScores } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Rider app" };

export default function RiderAppPage() {
  const rider = currentRider;
  return (
    <div className="grid gap-10 lg:grid-cols-[400px_1fr]">
      <PhoneFrame>
        <div className="space-y-4 px-4 pb-6 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Habari,</p>
              <p className="font-semibold">{rider.name.split(" ")[0]}</p>
            </div>
            <Link
              href="/rider/ride"
              className="rounded-full bg-hivis px-4 py-2 text-sm font-bold text-ink"
            >
              Anza kazi
            </Link>
          </div>

          <InstallPrompt />

          <div className="rounded-2xl bg-surface p-4 shadow-sm">
            <div className="flex justify-center">
              <ScoreGauge score={rider.score} size={200} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs">
              <span className="text-muted">
                This week{" "}
                <span className={rider.scoreDelta >= 0 ? "text-safe" : "text-danger"}>
                  {rider.scoreDelta >= 0 ? "▲" : "▼"} {Math.abs(rider.scoreDelta)}
                </span>
              </span>
              <span className="text-muted">
                Confidence <span className="font-semibold text-foreground">{rider.coverage}%</span>
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-hivis/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8a6400]">Ushauri wa wiki</p>
            <p className="mt-1.5 text-sm leading-relaxed">{coachingMessage.sw}</p>
            <p className="mt-2 text-xs font-medium text-[#8a6400]">📍 {coachingMessage.focus}</p>
          </div>

          <div className="space-y-3 rounded-2xl bg-surface p-4 shadow-sm">
            {(Object.keys(rider.subScores) as (keyof SubScores)[]).map((k) => (
              <ScoreBar key={k} label={subScoreLabels[k].sw} value={rider.subScores[k]} />
            ))}
          </div>

          <div className="rounded-2xl bg-surface p-4 shadow-sm">
            <p className="mb-2 text-sm font-semibold">Safari za karibuni</p>
            <ul className="divide-y divide-line">
              {recentTrips.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">{t.from} → {t.to}</p>
                    <p className="text-xs text-muted">{t.day} · {t.start} · {t.km} km</p>
                  </div>
                  <span className={`tabular font-semibold ${scoreTone(t.score).text}`}>{t.score}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-dashed border-line p-3 text-xs text-muted">
            <span>🔋 Battery saver on · 3% today</span>
            <span>Upload on WiFi tonight</span>
          </div>
        </div>
      </PhoneFrame>

      <div className="space-y-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Rider app</p>
          <h1 className="text-3xl font-bold tracking-tight">The score lives in the rider&apos;s pocket</h1>
          <p className="mt-2 max-w-xl text-muted">
            Riders see one number, what&apos;s driving it, and a single concrete thing to change this week,
            in Kiswahili. Sensing runs on a duty cycle so the phone still works as a business tool.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardTitle>8-week trend</CardTitle>
            <div className="flex items-end justify-between">
              <span className="tabular text-3xl font-bold">{rider.score}</span>
              <Sparkline values={rider.trend} width={160} height={44} stroke={scoreTone(rider.score).stroke} />
            </div>
          </Card>
          <Card>
            <CardTitle>This week</CardTitle>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="text-xs text-muted">Trips</dt>
                <dd className="tabular text-xl font-bold">{rider.trips}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Km</dt>
                <dd className="tabular text-xl font-bold">{rider.weeklyKm}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Night</dt>
                <dd className="tabular text-xl font-bold">{rider.nightShare}%</dd>
              </div>
            </dl>
          </Card>
        </div>

        <Card>
          <CardTitle action={<Badge tone="hivis">Gemini</Badge>}>Coaching, translated</CardTitle>
          <p className="text-sm text-muted">{coachingMessage.en}</p>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/rider/week" className="rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-ink">
            <p className="font-semibold">Week trace walkthrough →</p>
            <p className="mt-1 text-sm text-muted">Map, risk events and hour-by-hour risk behind this week&apos;s score.</p>
          </Link>
          <Link href="/rider/live" className="rounded-2xl bg-ink p-5 text-white transition-colors hover:bg-ink/90">
            <p className="font-semibold">Live sensor demo →</p>
            <p className="mt-1 text-sm text-white/70">Shake the phone and watch events register in real time.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
