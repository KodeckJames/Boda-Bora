import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Loading, loadOr } from "@/components/api-problem";
import { flagText } from "@/components/score-parts";
import { Button, Card, PageHeader, ScoreGauge, Sparkline, Stat, scoreTone } from "@/components/ui";
import { WeekView } from "@/components/week-view";
import { api } from "@/lib/api/server";
import type { CoachingMessage, RiderDetail, RiderScore, RiderWeek } from "@/lib/api/types";
import { pct, weekRange } from "@/lib/format";
import { format, withLocale, type Locale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "SACCO", robots: { index: false } };

// Rider ids are only known at request time. One placeholder lets the build prerender the shell
// (nav included); it isn't a UUID, so visiting it is a 404.
export function generateStaticParams() {
  return [{ id: "_" }];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_CONFIDENCE = 0.6;

async function RiderDetailView({ locale, params, searchParams }: { locale: Locale; params: Promise<{ id: string }>; searchParams: Promise<{ org?: string }> }) {
  const { id } = await params;
  const { org } = await searchParams;
  if (!UUID.test(id)) notFound();
  const { t } = await getI18n();
  const d = t.saccoRider;
  const here = withLocale(locale, `/sacco/riders/${id}`);

  const result = await loadOr(
    async () => {
      const [rider, score, coaching] = await Promise.all([
        api<RiderDetail>(`/api/riders/${id}`),
        api<RiderScore>(`/api/riders/${id}/score`),
        api<CoachingMessage[]>(`/api/coaching/riders/${id}?lang=${locale}`),
      ]);
      const week = await api<RiderWeek>(`/api/riders/${id}/week${score.current ? `?week=${score.current.week_start}` : ""}`);
      return { rider, score, coaching: coaching[0] ?? null, week };
    },
    { locale, t, next: here },
  );
  if (!result.ok) return result.problem;
  const { rider, score, coaching, week } = result.data;
  const current = score.current;
  const latest = score.history.at(-1);
  const coverage = pct(current?.coverage);
  const lowConfidence = !!current && current.confidence < MIN_CONFIDENCE;
  const trend = score.history.map((h) => Math.round(h.score));
  const nightM = week.trips.reduce((s, tr) => s + tr.night_m, 0);
  const distM = week.trips.reduce((s, tr) => s + tr.distance_m, 0);

  return (
    <>
      <PageHeader
        eyebrow={[rider.stage_name, rider.bike_reg, rider.phone].filter(Boolean).join(" · ")}
        title={rider.name}
        description={format(t.week.eyebrow, { range: weekRange(week.week_start, locale) })}
        actions={<Button href={`${withLocale(locale, "/sacco")}${org ? `?org=${org}` : ""}`} variant="secondary">{d.back}</Button>}
      />

      {lowConfidence && (
        <div className="mb-6 rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm">
          <p className="font-semibold text-danger">{d.lowConfidenceTitle}</p>
          <p className="mt-1 text-muted">{format(d.lowConfidenceBody, { confidence: pct(current.confidence)! })}</p>
          {latest && latest.flags.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-muted">
              {latest.flags.map((f) => (
                <li key={f}>• {flagText(t, f)}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center">
          {current ? (
            <>
              <ScoreGauge score={Math.round(current.score)} label={t.common.riderSafetyScore} riskLabels={t.common.risk} />
              {trend.length > 1 && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted">
                  <Sparkline values={trend} width={100} height={28} stroke={scoreTone(current.score).stroke} />
                  {format(d.weeks, { n: trend.length })}
                </div>
              )}
            </>
          ) : (
            <p className="py-10 text-center text-sm text-muted">{d.notScored}</p>
          )}
        </Card>
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <Stat
            label={d.coverageConfidence}
            value={coverage === null ? "—" : `${coverage}%`}
            hint={current?.coverage === null ? d.noShiftRecords : lowConfidence ? <span className="text-danger">{d.belowThreshold}</span> : d.dense}
          />
          <Stat label={d.tripsThisWeek} value={week.score?.trip_count ?? week.trips.length} hint={`${Math.round(week.score?.distance_km ?? distM / 1000)} km`} />
          <Stat label={d.nightShare} value={distM > 0 ? `${Math.round((nightM / distM) * 100)}%` : "—"} hint={d.nightShareHint} />
          <Stat
            label={d.riskEvents}
            value={week.events.length}
            hint={format(d.riskEventsHint, { n: week.events.filter((e) => e.blackspot).length })}
          />
        </div>
      </div>

      <WeekView week={week} coaching={coaching} locale={locale} t={t} riderId={rider.id} canRegenerate />
    </>
  );
}

export default async function RiderDetailPage({ params, searchParams }: PageProps<"/[lang]/sacco/riders/[id]">) {
  const { locale } = await getI18n();
  return (
    <Suspense fallback={<Loading className="h-[640px]" />}>
      <RiderDetailView locale={locale} params={params} searchParams={searchParams as Promise<{ org?: string }>} />
    </Suspense>
  );
}
