import { notFound } from "next/navigation";
import { CoverageBars, RouteMap } from "@/components/charts";
import { Badge, Button, Card, CardTitle, PageHeader, ScoreBar, ScoreGauge, Sparkline, Stat, scoreTone } from "@/components/ui";
import { coachingMessage, getRider, riders, riskEvents, shiftCoverage, subScoreLabels, type SubScores } from "@/lib/mock-data";

export function generateStaticParams() {
  return riders.map((r) => ({ id: r.id }));
}

export default async function RiderDetailPage({ params }: PageProps<"/sacco/riders/[id]">) {
  const { id } = await params;
  const rider = getRider(id);
  if (!rider) notFound();

  const lowCoverage = rider.coverage < 60;

  return (
    <>
      <PageHeader
        eyebrow={`${rider.stage} · ${rider.bike} · ${rider.phone}`}
        title={rider.name}
        actions={
          <>
            <Button href="/sacco" variant="secondary">← Fleet</Button>
            <Button>Send coaching</Button>
          </>
        }
      />

      {lowCoverage && (
        <div className="mb-6 rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm">
          <p className="font-semibold text-danger">Low-confidence score</p>
          <p className="mt-1 text-muted">
            Only {rider.coverage}% of this rider&apos;s SACCO shift hours have a matching trace, and the score
            rose {rider.scoreDelta} points as coverage fell. The score is shown but not shared with insurers
            until coverage recovers.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center">
          <ScoreGauge score={rider.score} />
          <div className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Sparkline values={rider.trend} width={100} height={28} stroke={scoreTone(rider.score).stroke} />
            8 weeks
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <Stat label="Coverage confidence" value={`${rider.coverage}%`} hint={lowCoverage ? <span className="text-danger">Below 60% threshold</span> : "Dense, representative logging"} />
          <Stat label="Trips this week" value={rider.trips} hint={`${rider.weeklyKm} km`} />
          <Stat label="Night share" value={`${rider.nightShare}%`} hint="of km between 19:00–06:00" />
          <Stat label="Risk events" value={riskEvents.length} hint="3 at mapped blackspots" />
        </div>

        <Card>
          <CardTitle>Score breakdown</CardTitle>
          <div className="space-y-3">
            {(Object.keys(rider.subScores) as (keyof SubScores)[]).map((k) => (
              <ScoreBar key={k} label={subScoreLabels[k].en} value={rider.subScores[k]} />
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle action={<Badge tone={lowCoverage ? "danger" : "safe"}>{rider.coverage}% matched</Badge>}>
            Shift records vs traced hours
          </CardTitle>
          <CoverageBars
            data={lowCoverage ? shiftCoverage.map((d, i) => ({ ...d, traced: d.traced * (i % 2 ? 0.25 : 0.55) })) : shiftCoverage}
          />
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>This week&apos;s route</CardTitle>
          <RouteMap events={riskEvents} />
        </Card>

        <Card>
          <CardTitle action={<Badge tone="hivis">AI</Badge>}>Latest coaching</CardTitle>
          <p className="text-sm leading-relaxed">{coachingMessage.sw}</p>
          <p className="mt-3 text-xs text-muted">Sent Sun 27 Oct · 19:02 via SMS</p>
        </Card>
      </div>
    </>
  );
}
