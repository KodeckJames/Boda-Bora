import type { EventType, LineString, Severity } from "@/lib/api/types";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

// Labels come from the caller's dictionary so charts render in the active language.
type ChartLabels = Dictionary["charts"] & {
  days: string[];
  events: Dictionary["common"]["events"];
};

export const chartLabels = (t: Dictionary): ChartLabels => ({ ...t.charts, days: t.common.days, events: t.common.events });

const severityColor = {
  low: "var(--warn)",
  medium: "#ea6a1f",
  high: "var(--danger)",
};

export type MapEvent = { id: string; type: EventType; severity: Severity; lat: number; lng: number; label: string };

const MAX_POINTS_PER_TRIP = 300;

// The week's recorded routes and where risk events happened, drawn to scale (no map tiles,
// so it works offline and costs nothing). Longitude is scaled by cos(latitude).
export function TraceMap({ paths, events, labels }: { paths: LineString[]; events: MapEvent[]; labels: ChartLabels }) {
  const lines = paths.map((p) => {
    const step = Math.max(1, Math.ceil(p.coordinates.length / MAX_POINTS_PER_TRIP));
    return p.coordinates.filter((_, i) => i % step === 0 || i === p.coordinates.length - 1);
  });
  const all = [...lines.flat(), ...events.map((e) => [e.lng, e.lat] as [number, number])];
  if (all.length === 0) {
    return (
      <div className="grid h-72 place-items-center rounded-xl bg-[#eef0ea] px-6 text-center text-sm text-muted">{labels.noRoutes}</div>
    );
  }

  const lats = all.map((c) => c[1]);
  const lngs = all.map((c) => c[0]);
  const midLat = ((Math.min(...lats) + Math.max(...lats)) / 2) * (Math.PI / 180);
  const xOf = (lng: number) => lng * Math.cos(midLat);
  const minX = Math.min(...lngs.map(xOf));
  const maxX = Math.max(...lngs.map(xOf));
  const minY = Math.min(...lats);
  const maxY = Math.max(...lats);
  // At least ~200 m across, so a single point or a short trip doesn't fill the box.
  const span = Math.max(maxX - minX, maxY - minY, 0.002);
  const W = 100;
  const H = 60;
  const scale = (Math.min(W, H) * 0.86) / span;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const px = (lng: number) => W / 2 + (xOf(lng) - cx) * scale;
  const py = (lat: number) => H / 2 - (lat - cy) * scale;

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#eef0ea]">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-72 w-full" role="img" aria-label={labels.routeMap}>
        <defs>
          <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M5 0H0V5" fill="none" stroke="#dfe2da" strokeWidth="0.15" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />
        {lines.map((coords, i) => (
          <polyline
            key={i}
            points={coords.map(([lng, lat]) => `${px(lng).toFixed(2)},${py(lat).toFixed(2)}`).join(" ")}
            fill="none"
            stroke="var(--ink)"
            strokeOpacity="0.55"
            strokeWidth="0.6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {events.map((e) => (
          <circle key={e.id} cx={px(e.lng)} cy={py(e.lat)} r="1.3" fill={severityColor[e.severity]} stroke="#fff" strokeWidth="0.4">
            <title>{e.label}</title>
          </circle>
        ))}
      </svg>
      <div className="absolute bottom-3 right-3 flex gap-3 rounded-md bg-white/90 px-2.5 py-1.5 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-3 rounded bg-ink/60" /> {labels.route}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-danger" /> {labels.event}
        </span>
      </div>
    </div>
  );
}

export function RiskHeatmap({ data, labels }: { data: number[][]; labels: ChartLabels }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: "36px repeat(24, minmax(0, 1fr))" }}>
          {data.map((row, d) => (
            <div key={d} className="contents">
              <span className="text-xs leading-5 text-muted">{labels.days[d]}</span>
              {row.map((v, h) => (
                <span
                  key={h}
                  title={`${labels.days[d]} ${String(h).padStart(2, "0")}:00 — ${labels.risk} ${(v * 100).toFixed(0)}`}
                  className="h-5 rounded-[3px]"
                  style={{
                    background: v === 0 ? "rgba(0,0,0,0.04)" : `color-mix(in oklab, var(--danger) ${Math.round(v * 100)}%, #fde9c4)`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-1 grid gap-[3px] text-[10px] text-muted" style={{ gridTemplateColumns: "36px repeat(24, minmax(0, 1fr))" }}>
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-center">
              {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CoverageBars({ data, labels }: { data: { day: number; shift: number; traced: number }[]; labels: ChartLabels }) {
  const max = Math.max(...data.map((d) => d.shift));
  if (!(max > 0)) {
    return <p className="grid h-40 place-items-center rounded-xl bg-black/3 px-6 text-center text-sm text-muted">{labels.noShifts}</p>;
  }
  return (
    <div>
      <div className="flex h-40 items-end gap-3">
        {data.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="relative w-full max-w-10 rounded-md bg-black/6" style={{ height: `${(d.shift / max) * 136}px` }}>
              <div className="absolute inset-x-0 bottom-0 rounded-md bg-ink" style={{ height: `${d.shift > 0 ? Math.min(100, (d.traced / d.shift) * 100) : 0}%` }} />
            </div>
            <span className="text-xs text-muted">{labels.days[d.day]}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-black/10" /> {labels.shiftHours}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ink" /> {labels.tracedHours}</span>
      </div>
    </div>
  );
}

export function Histogram({ data }: { data: { bucket: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div>
      <div className="flex h-44 items-end gap-2">
        {data.map((d) => {
          const score = Number(d.bucket) + 5;
          const color = score >= 75 ? "bg-safe" : score >= 55 ? "bg-warn" : "bg-danger";
          return (
            <div key={d.bucket} className="flex flex-1 flex-col items-center gap-1">
              <span className="tabular text-[11px] text-muted">{d.count}</span>
              <div className={`w-full rounded-t-md ${color}`} style={{ height: `${(d.count / max) * 140}px` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-2 text-[11px] text-muted">
        {data.map((d) => (
          <span key={d.bucket} className="flex-1 text-center">{d.bucket}+</span>
        ))}
      </div>
    </div>
  );
}
