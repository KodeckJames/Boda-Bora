"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Badge, Card, CardTitle } from "@/components/ui";
import { NotSignedInError } from "@/lib/api";
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

const statusLabel: Record<RideSession["status"], { text: string; tone: "neutral" | "safe" | "warn" | "danger" }> = {
  recording: { text: "Inarekodi · Recording", tone: "safe" },
  pending: { text: "Inasubiri · Not uploaded", tone: "warn" },
  uploading: { text: "Inapakia · Uploading", tone: "neutral" },
  uploaded: { text: "Imepakiwa · Uploaded", tone: "safe" },
  failed: { text: "Imeshindwa · Failed", tone: "danger" },
};

export function RideMode() {
  const support = useSyncExternalStore(noopSubscribe, getSupport, () => null);
  const [permissions, setPermissions] = useState<{ motion: boolean; gps: boolean } | null>(null);
  const [state, setState] = useState<RecorderState | null>(null);
  const [sessions, setSessions] = useState<RideSession[]>([]);
  const [pocket, setPocket] = useState(false);
  const [now, setNow] = useState(0); // set by the timer while recording
  const [notice, setNotice] = useState<string | null>(null);
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
    const r = new RideRecorder(resume);
    recorder.current = r;
    r.subscribe(setState);
    await r.start();
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
    setNotice(
      result?.status === "failed" && result.error === new NotSignedInError().message
        ? "Ingia kwanza ili kupakia · Sign in to upload. Your shift is saved on this phone."
        : null,
    );
    void refresh();
  }

  const s = state?.session;
  const gpsOk = permissions?.gps ?? false;

  return (
    <div className="space-y-4">
      {interrupted && !recording && (
        <Card className="border-warn/40">
          <p className="font-semibold">Zamu iliyokatizwa · Interrupted shift</p>
          <p className="mt-1 text-sm text-muted">
            A shift from {new Date(interrupted.startedAt).toLocaleTimeString("en-KE")} was still
            recording when the app closed. The time it was closed counts as a gap.
          </p>
          <button
            type="button"
            onClick={() => void start(interrupted)}
            disabled={!gpsOk}
            className="mt-3 h-10 rounded-full bg-ink px-5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Endelea · Resume
          </button>
        </Card>
      )}

      {!recording && (
        <Card>
          <CardTitle>1. Ruhusa · Permissions</CardTitle>
          <p className="text-sm text-muted">
            Boda Bora inahitaji GPS na vihisi vya mwendo ili kupima uendeshaji wako. Data inakaa
            kwenye simu hadi uipakie. <span className="block pt-1 text-xs">We need GPS and motion
            sensors to measure your riding. Data stays on this phone until you upload it.</span>
          </p>
          {support && (!support.motion || !support.gps) && (
            <p className="mt-2 text-sm text-danger">
              This browser doesn&apos;t support {!support.gps ? "GPS" : "motion sensors"}.
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void grant()}
              className="h-10 rounded-full border border-line px-5 text-sm font-semibold"
            >
              Ruhusu · Allow
            </button>
            {permissions && (
              <>
                <Badge tone={permissions.gps ? "safe" : "danger"}>GPS {permissions.gps ? "✓" : "✕"}</Badge>
                <Badge tone={permissions.motion ? "safe" : "danger"}>
                  Mwendo {permissions.motion ? "✓" : "✕"}
                </Badge>
              </>
            )}
          </div>
        </Card>
      )}

      <Card className={recording ? "border-safe/40" : ""}>
        <CardTitle
          action={
            recording ? (
              <Badge tone="safe">● Inarekodi</Badge>
            ) : (
              <Badge>Haijaanza</Badge>
            )
          }
        >
          2. Zamu · Shift
        </CardTitle>

        {recording && s ? (
          <>
            <p className="tabular text-5xl font-bold tracking-tight">{duration(now - s.startedAt)}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-black/4 p-2">
                <dt className="text-xs text-muted">Km</dt>
                <dd className="tabular text-lg font-bold">{(s.stats.distanceM / 1000).toFixed(1)}</dd>
              </div>
              <div className="rounded-xl bg-black/4 p-2">
                <dt className="text-xs text-muted">GPS</dt>
                <dd className="tabular text-lg font-bold">{s.stats.gpsFixes}</dd>
              </div>
              <div className="rounded-xl bg-black/4 p-2">
                <dt className="text-xs text-muted">Mwendo</dt>
                <dd className="tabular text-lg font-bold">{s.stats.motionSamples}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted">
              Skrini:{" "}
              {state?.wakeLock === "active"
                ? "itabaki imewaka · screen stays on"
                : state?.wakeLock === "unsupported"
                  ? "simu hii haiwezi kuzuia skrini kuzima · keep the screen on manually"
                  : "inaweza kuzima · may turn off"}
              {s.gaps.length > 0 && ` · ${s.gaps.length} gap(s)`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPocket(true)}
                className="h-11 flex-1 rounded-full bg-ink px-5 text-sm font-semibold text-white"
              >
                Skrini ya mfukoni · Pocket screen
              </button>
              <button
                type="button"
                onClick={() => void finish()}
                className="h-11 flex-1 rounded-full bg-danger px-5 text-sm font-semibold text-white"
              >
                Maliza · Finish
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              Weka app wazi wakati wa zamu nzima. Saa ambazo app imefungwa zinaonekana kama
              mapengo na hupunguza uaminifu wa alama yako.{" "}
              <span className="block pt-1 text-xs">
                Keep the app open for the whole shift. Time with the app closed shows as a gap and
                lowers your score&apos;s confidence.
              </span>
            </p>
            <button
              type="button"
              onClick={() => void start()}
              disabled={!gpsOk}
              className="mt-4 h-12 w-full rounded-full bg-hivis text-base font-bold text-ink disabled:opacity-40"
            >
              Anza kazi · Start shift
            </button>
            {!gpsOk && <p className="mt-2 text-center text-xs text-muted">Allow GPS first.</p>}
          </>
        )}
      </Card>

      <Card>
        <CardTitle>3. Zamu zilizohifadhiwa · Saved shifts</CardTitle>
        {notice && <p className="mb-3 rounded-xl bg-warn/10 p-3 text-sm text-[#9a5d00]">{notice}</p>}
        {sessions.filter((x) => x.status !== "recording").length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">Hakuna bado · No shifts yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {sessions
              .filter((x) => x.status !== "recording")
              .map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <p className="font-medium">
                      {new Date(x.startedAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                    <p className="text-xs text-muted">
                      {duration((x.endedAt ?? x.startedAt) - x.startedAt)} ·{" "}
                      {(x.stats.distanceM / 1000).toFixed(1)} km · {x.gaps.length} gap(s)
                    </p>
                    <div className="mt-1">
                      <Badge tone={statusLabel[x.status].tone}>{statusLabel[x.status].text}</Badge>
                    </div>
                  </div>
                  {(x.status === "pending" || x.status === "failed") && (
                    <button
                      type="button"
                      onClick={() => void upload(x.id)}
                      className="h-9 shrink-0 rounded-full border border-line px-4 text-sm font-semibold"
                    >
                      Pakia · Upload
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
          <p className="mt-2 text-xs">● Inarekodi · Recording</p>
          <p className="absolute bottom-10 text-xs">Bonyeza kwa sekunde 2 kufungua · Hold 2s to exit</p>
        </div>
      )}
    </div>
  );
}
