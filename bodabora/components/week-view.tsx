import { ActionButton } from "@/components/action-button";
import { chartLabels, CoverageBars, RiskHeatmap, TraceMap, type MapEvent } from "@/components/charts";
import { SubScoreBars } from "@/components/score-parts";
import { Badge, Card, CardTitle, ScoreGauge } from "@/components/ui";
import { regenerateCoaching } from "@/lib/actions";
import type { CoachingMessage, LineString, RiderWeek } from "@/lib/api/types";
import { format as fmt, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { km, timeOf, weekdayOf } from "@/lib/format";

const severityTone = { low: "warn", medium: "warn", high: "danger" } as const;
const MAX_LOG = 12;

// One week of a rider's trace: route and events, score breakdown, when risk concentrates,
// shift coverage and the coaching that resulted. Shared by the rider and their SACCO.
export function WeekView({
  week,
  coaching,
  locale,
  t,
  riderId,
  canRegenerate = false,
}: {
  week: RiderWeek;
  coaching: CoachingMessage | null;
  locale: Locale;
  t: Dictionary;
  riderId: string;
  canRegenerate?: boolean;
}) {
  const w = t.week;
  const labels = chartLabels(t);
  const located = week.events.filter((e) => e.lat !== null && e.lng !== null);
  const eventLabel = (e: RiderWeek["events"][number]) =>
    [t.common.events[e.type], `${t.common.days[weekdayOf(e.occurred_at)]} ${timeOf(e.occurred_at, locale)}`, e.blackspot]
      .filter(Boolean)
      .join(" · ");
  const mapEvents: MapEvent[] = located.map((e) => ({ id: e.id, type: e.type, severity: e.severity, lat: e.lat!, lng: e.lng!, label: eventLabel(e) }));
  const paths = week.trips.map((tr) => tr.path).filter((p): p is LineString => !!p && p.coordinates.length > 1);
  const distanceKm = week.score?.distance_km ?? km(week.trips.reduce((s, tr) => s + tr.distance_m, 0));

  // Heatmap shades relative to this week's busiest hour.
  const peak = Math.max(0, ...week.hourly_risk.flat());
  const heat = week.hourly_risk.map((row) => row.map((v) => (peak > 0 ? v / peak : 0)));
  const coverage = week.coverage_by_day.map((d, day) => ({ day, shift: d.shift_hours, traced: d.recorded_hours }));
  const log = [...week.events].reverse().slice(0, MAX_LOG);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardTitle
          action={<span className="text-xs text-muted">{fmt(w.routeMeta, { events: week.events.length, km: Math.round(distanceKm * 10) / 10 })}</span>}
        >
          {w.route}
        </CardTitle>
        <TraceMap paths={paths} events={mapEvents} labels={labels} />
      </Card>

      <Card className="flex flex-col">
        <CardTitle>{w.weeklyScore}</CardTitle>
        {week.score ? (
          <>
            <div className="flex justify-center">
              <ScoreGauge score={Math.round(week.score.score)} label={t.common.riderSafetyScore} riskLabels={t.common.risk} />
            </div>
            <div className="mt-6">
              <SubScoreBars scores={week.score} t={t} />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">{w.notScored}</p>
        )}
      </Card>

      <Card className="lg:col-span-2">
        <CardTitle action={<span className="text-xs text-muted">{w.darker}</span>}>{w.whenRisk}</CardTitle>
        {peak > 0 ? <RiskHeatmap data={heat} labels={labels} /> : <p className="text-sm text-muted">{w.noEvents}</p>}
      </Card>

      <Card>
        <CardTitle>{w.eventLog}</CardTitle>
        {log.length === 0 ? (
          <p className="text-sm text-muted">{w.noEvents}</p>
        ) : (
          <ul className="space-y-3">
            {log.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{t.common.events[e.type]}</p>
                  <p className="text-xs text-muted">
                    {t.common.days[weekdayOf(e.occurred_at)]} {timeOf(e.occurred_at, locale)}
                    {e.blackspot ? ` · ${e.blackspot}` : ""}
                  </p>
                </div>
                {e.speed_kmh !== null && <Badge tone={severityTone[e.severity]}>{Math.round(e.speed_kmh)} km/h</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="lg:col-span-2">
        <CardTitle>{t.saccoRider.shiftVsTraced}</CardTitle>
        <CoverageBars data={coverage} labels={labels} />
      </Card>

      <Card>
        <CardTitle action={coaching && <Badge tone="hivis">{coaching.source === "ai" ? w.generatedBy : w.template}</Badge>}>{w.coaching}</CardTitle>
        {coaching ? (
          <>
            <p className="leading-relaxed">{coaching.message}</p>
            {coaching.focus && <p className="mt-2 text-xs font-medium text-[#8a6400]">📍 {coaching.focus}</p>}
          </>
        ) : (
          <p className="text-sm text-muted">{w.noCoaching}</p>
        )}
        {canRegenerate && (
          <div className="mt-4 border-t border-line pt-4">
            <ActionButton action={regenerateCoaching.bind(null, riderId)} small>
              {w.regenerate}
            </ActionButton>
          </div>
        )}
      </Card>
    </div>
  );
}
