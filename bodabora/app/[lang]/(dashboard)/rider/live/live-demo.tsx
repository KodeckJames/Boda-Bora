"use client";

import { useState } from "react";
import { Badge, Card, CardTitle, ScoreGauge } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";

type EventKey = "harsh_braking" | "sharp_cornering" | "rapid_acceleration";
type LiveEvent = { id: number; type: EventKey; g: string; at: string };

// UI-only: sensor wiring (DeviceMotionEvent + GPS fusion) comes later.
// "Simulate" buttons stand in for real detections so the screen can be reviewed.
const simulated: { type: EventKey; g: string; penalty: number }[] = [
  { type: "harsh_braking", g: "0.62 g", penalty: 4 },
  { type: "sharp_cornering", g: "0.48 g", penalty: 3 },
  { type: "rapid_acceleration", g: "0.41 g", penalty: 2 },
];

// Static waveform placeholder for the accelerometer trace
function wave(seed: number, spike?: number) {
  return Array.from({ length: 60 }, (_, i) => {
    const base = Math.sin(i * 0.6 + seed) * 4 + Math.sin(i * 1.7 + seed * 2) * 2;
    const s = spike !== undefined && i > 50 ? (i === 54 ? 26 : i === 55 ? -18 : 6) : 0;
    return `${i * 5},${40 - base - s}`;
  }).join(" ");
}

export function LiveDemo() {
  const { t } = useI18n();
  const l = t.live;
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(78);
  const [events, setEvents] = useState<LiveEvent[]>([]);

  function trigger(i: number) {
    const s = simulated[i]!;
    setScore((v) => Math.max(0, v - s.penalty));
    setEvents((ev) => [
      { id: Date.now(), type: s.type, g: s.g, at: new Date().toLocaleTimeString("en-KE", { hour12: false }) },
      ...ev,
    ].slice(0, 6));
  }

  const spiked = events.length > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <Card className="flex flex-col items-center justify-center py-10">
        <ScoreGauge score={score} size={240} label={l.tripScore} riskLabels={t.common.risk} />
        <p className="mt-4 text-sm text-muted">{l.tripScore}</p>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className={`h-11 rounded-full px-6 text-sm font-semibold ${running ? "bg-danger text-white" : "bg-ink text-white"}`}
          >
            {running ? l.stop : l.start}
          </button>
          <button
            type="button"
            onClick={() => {
              setScore(78);
              setEvents([]);
            }}
            className="h-11 rounded-full border border-line px-5 text-sm font-semibold"
          >
            {l.reset}
          </button>
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardTitle action={running ? <Badge tone="safe">{l.liveRate}</Badge> : <Badge>{l.idle}</Badge>}>
            {l.accelerometer}
          </CardTitle>
          <svg viewBox="0 0 300 80" className="h-28 w-full">
            <line x1="0" y1="40" x2="300" y2="40" stroke="currentColor" strokeOpacity="0.1" />
            <polyline points={wave(0, spiked ? 1 : undefined)} fill="none" stroke="var(--danger)" strokeWidth="1.5" opacity={running ? 1 : 0.3} />
            <polyline points={wave(2)} fill="none" stroke="var(--safe)" strokeWidth="1.5" opacity={running ? 1 : 0.3} />
            <polyline points={wave(4)} fill="none" stroke="#3b6fd8" strokeWidth="1.5" opacity={running ? 1 : 0.3} />
          </svg>
          <div className="flex gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-danger" /> {l.longitudinal}</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-safe" /> {l.lateral}</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-[#3b6fd8]" /> {l.vertical}</span>
          </div>
        </Card>

        <Card>
          <CardTitle>{l.simulate}</CardTitle>
          <div className="flex flex-wrap gap-2">
            {simulated.map((s, i) => (
              <button
                key={s.type}
                type="button"
                onClick={() => trigger(i)}
                className="h-9 rounded-full border border-line bg-background px-4 text-sm font-medium hover:border-ink"
              >
                {t.common.events[s.type]}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>{l.detected}</CardTitle>
          {events.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{l.noEvents}</p>
          ) : (
            <ul className="divide-y divide-line">
              {events.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium">{t.common.events[e.type]}</span>
                  <span className="tabular flex items-center gap-3 text-muted">
                    {e.g}
                    <span className="font-mono text-xs">{e.at}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
