"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Badge, Card, CardTitle } from "@/components/ui";
import { NoRiderProfileError, NotSignedInError } from "@/lib/api";
import { useI18n } from "@/lib/i18n/client";
import { format, withLocale } from "@/lib/i18n/config";
import {
  RideRecorder,
  requestPermissions,
  sensorSupport,
  type RecorderState,
  type SensorSupport,
} from "@/lib/ride/recorder";
import { listSessions, type RideSession } from "@/lib/ride/store";
import { uploadSession } from "@/lib/ride/upload";

const HOLD_TO_EXIT_MS = 2000;

// Sensor support never changes, so read it once (a stable snapshot for useSyncExternalStore).
let cachedSupport: SensorSupport | undefined;
const getSupport = () => (cachedSupport ??= sensorSupport());
const noopSubscribe = () => () => {};

function duration(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const statusTone: Record<RideSession["status"], "neutral" | "safe" | "warn" | "danger"> = {
  recording: "safe",
  pending: "warn",
  uploading: "neutral",
  uploaded: "safe",
  failed: "danger",
};

export function RideMode() {
  const { locale, t } = useI18n();
  const r = t.ride;
  const dateLocale = locale === "sw" ? "sw-KE" : "en-KE";
  const support = useSyncExternalStore(noopSubscribe, getSupport, () => null);
  const [permissions, setPermissions] = useState<{ motion: boolean; gps: boolean } | null>(null);
  const [state, setState] = useState<RecorderState | null>(null);
  const [sessions, setSessions] = useState<RideSession[]>([]);
  const [pocket, setPocket] = useState(false);
  const [now, setNow] = useState(0); // set by the timer while recording
  // Why the last upload couldn't start: signed out, or no rider profile yet.
  const [uploadBlock, setUploadBlock] = useState<"signin" | "profile" | null>(null);
  const recorder = useRef<RideRecorder | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => setSessions(await listSessions()), []);

  // Load saved shifts from IndexedDB on mount.
  useEffect(() => {
    let alive = true;
    listSessions().then((list) => {
      if (alive) setSessions(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [state]);

  const interrupted = sessions.find((s) => s.status === "recording" && s.id !== state?.session.id);
  const recording = state?.session.status === "recording";

  async function grant() {
    setPermissions(await requestPermissions());
  }

  async function start(resume?: RideSession) {
    setNow(Date.now());
    const rec = new RideRecorder(resume);
    recorder.current = rec;
    rec.subscribe(setState);
    await rec.start();
    void refresh();
  }

  async function finish() {
    await recorder.current?.stop();
    recorder.current = null;
    setPocket(false);
    setState(null);
    void refresh();
  }

  async function upload(id: string) {
    const result = await uploadSession(id);
    const error = result?.status === "failed" ? result.error : undefined;
    setUploadBlock(
      error === new NotSignedInError().message ? "signin" : error === new NoRiderProfileError().message ? "profile" : null,
    );
    void refresh();
  }

  const s = state?.session;
  const gpsOk = permissions?.gps ?? false;

  return (
    <div className="space-y-4">
      {interrupted && !recording && (
        <Card className="border-warn/40">
          <p className="font-semibold">{r.interruptedTitle}</p>
          <p className="mt-1 text-sm text-muted">
            {format(r.interruptedBody, { time: new Date(interrupted.startedAt).toLocaleTimeString(dateLocale) })}
          </p>
          <button
            type="button"
            onClick={() => void start(interrupted)}
            disabled={!gpsOk}
            className="mt-3 h-10 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {r.resume}
          </button>
        </Card>
      )}

      {!recording && (
        <Card>
          <CardTitle>{r.permissionsTitle}</CardTitle>
          <p className="text-sm text-muted">{r.permissionsBody}</p>
          {support && (!support.motion || !support.gps) && (
            <p className="mt-2 text-sm text-danger">
              {format(r.unsupported, { sensor: !support.gps ? r.gps : r.motion })}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void grant()}
              className="h-10 rounded-full border border-line px-5 text-sm font-semibold"
            >
              {r.allow}
            </button>
            {permissions && (
              <>
                <Badge tone={permissions.gps ? "safe" : "danger"}>{r.gps} {permissions.gps ? "✓" : "✕"}</Badge>
                <Badge tone={permissions.motion ? "safe" : "danger"}>
                  {r.motionShort} {permissions.motion ? "✓" : "✕"}
                </Badge>
              </>
            )}
          </div>
        </Card>
      )}

      <Card className={recording ? "border-safe/40" : ""}>
        <CardTitle action={recording ? <Badge tone="safe">{r.recording}</Badge> : <Badge>{r.notStarted}</Badge>}>
          {r.shiftTitle}
        </CardTitle>

        {recording && s ? (
          <>
            <p className="tabular text-5xl font-bold tracking-tight">{duration(now - s.startedAt)}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-black/4 p-2">
                <dt className="text-xs text-muted">{r.km}</dt>
                <dd className="tabular text-lg font-bold">{(s.stats.distanceM / 1000).toFixed(1)}</dd>
              </div>
              <div className="rounded-xl bg-black/4 p-2">
                <dt className="text-xs text-muted">{r.gps}</dt>
                <dd className="tabular text-lg font-bold">{s.stats.gpsFixes}</dd>
              </div>
              <div className="rounded-xl bg-black/4 p-2">
                <dt className="text-xs text-muted">{r.motionShort}</dt>
                <dd className="tabular text-lg font-bold">{s.stats.motionSamples}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted">
              {r.screen}:{" "}
              {state?.wakeLock === "active"
                ? r.screenOn
                : state?.wakeLock === "unsupported"
                  ? r.screenUnsupported
                  : r.screenMayOff}
              {s.gaps.length > 0 && ` · ${format(r.gaps, { n: s.gaps.length })}`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPocket(true)}
                className="h-11 flex-1 rounded-full bg-ink px-5 text-sm font-semibold text-white"
              >
                {r.pocketScreen}
              </button>
              <button
                type="button"
                onClick={() => void finish()}
                className="h-11 flex-1 rounded-full bg-danger px-5 text-sm font-semibold text-white"
              >
                {r.finish}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">{r.keepOpen}</p>
            <button
              type="button"
              onClick={() => void start()}
              disabled={!gpsOk}
              className="mt-4 h-12 w-full rounded-full bg-hivis text-base font-bold text-ink disabled:opacity-40"
            >
              {r.start}
            </button>
            {!gpsOk && <p className="mt-2 text-center text-xs text-muted">{r.allowGpsFirst}</p>}
          </>
        )}
      </Card>

      <Card>
        <CardTitle>{r.savedTitle}</CardTitle>
        {uploadBlock && (
          <p className="mb-3 rounded-xl bg-warn/10 p-3 text-sm text-[#9a5d00]">
            {uploadBlock === "signin" ? r.signInToUpload : r.profileToUpload}{" "}
            <Link
              href={
                uploadBlock === "signin"
                  ? `${withLocale(locale, "/sign-in")}?next=${encodeURIComponent(withLocale(locale, "/rider/ride"))}`
                  : withLocale(locale, "/onboarding")
              }
              className="font-semibold underline"
            >
              {uploadBlock === "signin" ? t.auth.signIn : r.finishProfile}
            </Link>
          </p>
        )}
        {sessions.filter((x) => x.status !== "recording").length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">{r.noShifts}</p>
        ) : (
          <ul className="divide-y divide-line">
            {sessions
              .filter((x) => x.status !== "recording")
              .map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {new Date(x.startedAt).toLocaleString(dateLocale, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                    <p className="text-xs text-muted">
                      {duration((x.endedAt ?? x.startedAt) - x.startedAt)} ·{" "}
                      {(x.stats.distanceM / 1000).toFixed(1)} km · {format(r.gaps, { n: x.gaps.length })}
                    </p>
                    <div className="mt-1">
                      <Badge tone={statusTone[x.status]}>{r.status[x.status]}</Badge>
                    </div>
                  </div>
                  {(x.status === "pending" || x.status === "failed") && (
                    <button
                      type="button"
                      onClick={() => void upload(x.id)}
                      className="h-9 shrink-0 rounded-full border border-line px-4 text-sm font-semibold"
                    >
                      {r.upload}
                    </button>
                  )}
                </li>
              ))}
          </ul>
        )}
      </Card>

      {pocket && s && (
        // Black screen for riding with the phone in a pocket: saves battery on OLED screens
        // and ignores accidental touches. A 2-second press anywhere closes it.
        <div
          className="fixed inset-0 z-50 flex select-none flex-col items-center justify-center bg-black text-white/30"
          style={{ touchAction: "none" }}
          onPointerDown={() => {
            holdTimer.current = setTimeout(() => setPocket(false), HOLD_TO_EXIT_MS);
          }}
          onPointerUp={() => holdTimer.current && clearTimeout(holdTimer.current)}
          onPointerLeave={() => holdTimer.current && clearTimeout(holdTimer.current)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <p className="tabular text-3xl font-semibold">{duration(now - s.startedAt)}</p>
          <p className="mt-2 text-xs">{r.pocketRecording}</p>
          <p className="absolute bottom-10 text-xs">{r.holdToExit}</p>
        </div>
      )}
    </div>
  );
}
