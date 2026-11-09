import type { Metadata } from "next";
import { chartLabels, RiskHeatmap, RouteMap } from "@/components/charts";
import { Badge, Button, Card, CardTitle, PageHeader, ScoreBar, ScoreGauge } from "@/components/ui";
import { format, withLocale } from "@/lib/i18n/config";
import { getDictionary, getI18n } from "@/lib/i18n/server";
import { coachingMessage, currentRider, hourlyRisk, riskEvents, type SubScores } from "@/lib/mock-data";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).week.metaTitle };
}

const severityTone = { low: "warn", medium: "warn", high: "danger" } as const;

export default async function WeekTracePage() {
  const { locale, t } = await getI18n();
  const w = t.week;
  const labels = chartLabels(t);
  const rider = currentRider;
  return (
    <>
      <PageHeader
        eyebrow={w.eyebrow}
        title={format(w.title, { name: rider.name })}
        description={w.description}
        actions={<Button href={withLocale(locale, "/rider")} variant="secondary">{t.common.backToRiderApp}</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle action={<span className="text-xs text-muted">{format(w.routeMeta, { events: riskEvents.length, km: rider.weeklyKm })}</span>}>
            {w.route}
          </CardTitle>
          <RouteMap events={riskEvents} labels={labels} />
        </Card>

        <Card className="flex flex-col">
          <CardTitle>{w.weeklyScore}</CardTitle>
          <div className="flex justify-center">
            <ScoreGauge score={rider.score} label={t.common.riderSafetyScore} riskLabels={t.common.risk} />
          </div>
          <div className="mt-6 space-y-3">
            {(Object.keys(rider.subScores) as (keyof SubScores)[]).map((k) => (
              <ScoreBar key={k} label={t.common.subScores[k]} value={rider.subScores[k]} />
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle action={<span className="text-xs text-muted">{w.darker}</span>}>{w.whenRisk}</CardTitle>
          <RiskHeatmap data={hourlyRisk} labels={labels} />
        </Card>

        <Card>
          <CardTitle>{w.eventLog}</CardTitle>
          <ul className="space-y-3">
            {riskEvents.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{t.common.events[e.type]}</p>
                  <p className="text-xs text-muted">{t.common.days[e.day]} {e.time} · {e.place}</p>
                </div>
                <Badge tone={severityTone[e.severity]}>{e.speedKmh} km/h</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-3">
          <CardTitle action={<Badge tone="hivis">{w.generatedBy}</Badge>}>{w.coaching}</CardTitle>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{w.sentToRider}</p>
          <p className="max-w-3xl leading-relaxed">{coachingMessage[locale]}</p>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <Button variant="primary">{w.sendSms}</Button>
            <Button variant="secondary">{w.regenerate}</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
