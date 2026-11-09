import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { chartLabels, CoverageBars, RouteMap } from "@/components/charts";
import { Badge, Button, Card, CardTitle, PageHeader, ScoreBar, ScoreGauge, Sparkline, Stat, scoreTone } from "@/components/ui";
import { format, withLocale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { coachingMessage, getRider, riders, riskEvents, shiftCoverage, type SubScores } from "@/lib/mock-data";

// Combined with the [lang] layout's params: every rider in both languages.
export function generateStaticParams() {
  return riders.map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/sacco/riders/[id]">): Promise<Metadata> {
  const { id } = await params;
  const rider = getRider(id);
  return { title: rider ? `${rider.name} · SACCO` : "404" };
}

export default async function RiderDetailPage({ params }: PageProps<"/[lang]/sacco/riders/[id]">) {
  const { id } = await params;
  const rider = getRider(id);
  if (!rider) notFound();
  const { locale, t } = await getI18n();
  const d = t.saccoRider;
  const labels = chartLabels(t);

  const lowCoverage = rider.coverage < 60;

  return (
    <>
      <PageHeader
        eyebrow={`${rider.stage} · ${rider.bike} · ${rider.phone}`}
        title={rider.name}
        actions={
          <>
            <Button href={withLocale(locale, "/sacco")} variant="secondary">{d.back}</Button>
            <Button>{t.sacco.sendCoaching}</Button>
          </>
        }
      />

      {lowCoverage && (
        <div className="mb-6 rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm">
          <p className="font-semibold text-danger">{d.lowConfidenceTitle}</p>
          <p className="mt-1 text-muted">{format(d.lowConfidenceBody, { coverage: rider.coverage, delta: rider.scoreDelta })}</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center">
          <ScoreGauge score={rider.score} label={t.common.riderSafetyScore} riskLabels={t.common.risk} />
          <div className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Sparkline values={rider.trend} width={100} height={28} stroke={scoreTone(rider.score).stroke} />
            {d.weeks8}
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <Stat
            label={d.coverageConfidence}
            value={`${rider.coverage}%`}
            hint={lowCoverage ? <span className="text-danger">{d.belowThreshold}</span> : d.dense}
          />
          <Stat label={d.tripsThisWeek} value={rider.trips} hint={`${rider.weeklyKm} km`} />
          <Stat label={d.nightShare} value={`${rider.nightShare}%`} hint={d.nightShareHint} />
          <Stat label={d.riskEvents} value={riskEvents.length} hint={d.riskEventsHint} />
        </div>

        <Card>
          <CardTitle>{d.breakdown}</CardTitle>
          <div className="space-y-3">
            {(Object.keys(rider.subScores) as (keyof SubScores)[]).map((k) => (
              <ScoreBar key={k} label={t.common.subScores[k]} value={rider.subScores[k]} />
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle action={<Badge tone={lowCoverage ? "danger" : "safe"}>{format(d.matched, { pct: rider.coverage })}</Badge>}>
            {d.shiftVsTraced}
          </CardTitle>
          <CoverageBars
            data={lowCoverage ? shiftCoverage.map((day, i) => ({ ...day, traced: day.traced * (i % 2 ? 0.25 : 0.55) })) : shiftCoverage}
            labels={labels}
          />
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>{d.route}</CardTitle>
          <RouteMap events={riskEvents} labels={labels} />
        </Card>

        <Card>
          <CardTitle action={<Badge tone="hivis">AI</Badge>}>{d.latestCoaching}</CardTitle>
          <p className="text-sm leading-relaxed">{coachingMessage[locale]}</p>
          <p className="mt-3 text-xs text-muted">{d.sentAt}</p>
        </Card>
      </div>
    </>
  );
}
