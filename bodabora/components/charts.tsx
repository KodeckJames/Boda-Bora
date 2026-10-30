import { blackspots, days, type RiskEvent } from "@/lib/mock-data";

const severityColor = {
  low: "var(--warn)",
  medium: "#ea6a1f",
  high: "var(--danger)",
};

// Stylised map of the Thika Road corridor. Swap for a real map (Leaflet/Mapbox) once traces exist.
export function RouteMap({ events }: { events: RiskEvent[] }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[#eef0ea]">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-72 w-full">
        <defs>
          <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M8 0H0V8" fill="none" stroke="#dfe2da" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        {/* Side roads */}
        <path d="M46 50 L40 30 L44 10" fill="none" stroke="#fff" strokeWidth="2" />
        <path d="M58 36 L70 50 L86 56" fill="none" stroke="#fff" strokeWidth="2" />
        <path d="M34 60 L22 48 L8 44" fill="none" stroke="#fff" strokeWidth="2" />
        {/* Thika Road */}
        <path d="M4 92 L16 78 L34 60 L46 50 L58 36 L74 22 L96 6" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
        <path d="M4 92 L16 78 L34 60 L46 50 L58 36 L74 22 L96 6" fill="none" stroke="var(--hivis)" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="2 1.5" />
        {blackspots.map((b) => (
          <circle key={b.name} cx={b.x} cy={b.y} r="6" fill="var(--danger)" fillOpacity="0.1" stroke="var(--danger)" strokeOpacity="0.35" strokeWidth="0.3" />
        ))}
      </svg>
      {/* Event pins rendered as HTML so they stay round with preserveAspectRatio="none" */}
      {events.map((e) => (
        <span
          key={e.id}
          title={`${e.type} · ${e.day} ${e.time} · ${e.place}`}
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
          style={{ left: `${e.x}%`, top: `${e.y}%`, background: severityColor[e.severity] }}
        />
      ))}
      <div className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-muted">
        Thika Road corridor
      </div>
      <div className="absolute bottom-3 right-3 flex gap-3 rounded-md bg-white/90 px-2.5 py-1.5 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-danger" /> Event
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full border border-danger/40 bg-danger/10" /> Blackspot
        </span>
      </div>
    </div>
  );
}

export function RiskHeatmap({ data }: { data: number[][] }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: "36px repeat(24, minmax(0, 1fr))" }}>
          {data.map((row, d) => (
            <div key={days[d]} className="contents">
              <span className="text-xs leading-5 text-muted">{days[d]}</span>
              {row.map((v, h) => (
                <span
                  key={h}
                  title={`${days[d]} ${String(h).padStart(2, "0")}:00 — risk ${(v * 100).toFixed(0)}`}
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

export function CoverageBars({ data }: { data: { day: string; shift: number; traced: number }[] }) {
  const max = Math.max(...data.map((d) => d.shift));
  return (
    <div>
      <div className="flex h-40 items-end gap-3">
        {data.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="relative w-full max-w-10 rounded-md bg-black/6" style={{ height: `${(d.shift / max) * 136}px` }}>
              <div className="absolute inset-x-0 bottom-0 rounded-md bg-ink" style={{ height: `${(d.traced / d.shift) * 100}%` }} />
            </div>
            <span className="text-xs text-muted">{d.day}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-black/10" /> SACCO shift hours</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ink" /> Hours with trace</span>
      </div>
    </div>
  );
}

export function Histogram({ data }: { data: { bucket: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count));
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
          <span key={d.bucket} className="flex-1 text-center">{d.bucket}s</span>
        ))}
      </div>
    </div>
  );
}
