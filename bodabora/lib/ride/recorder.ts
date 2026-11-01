import { addChunk, putSession, type GpsFix, type MotionSample, type RideSession } from "./store";

// Records a shift while the app is open: motion sensors (downsampled to 10 Hz) and GPS,
// flushed to IndexedDB every few seconds. Event detection and scoring happen on the server.

const SAMPLE_MS = 100; // 10 Hz
const FLUSH_MS = 5000;

export type SensorSupport = { motion: boolean; gps: boolean; wakeLock: boolean };

export function sensorSupport(): SensorSupport {
  return {
    motion: typeof window !== "undefined" && "DeviceMotionEvent" in window,
    gps: typeof navigator !== "undefined" && "geolocation" in navigator,
    wakeLock: typeof navigator !== "undefined" && "wakeLock" in navigator,
  };
}

// iOS asks for motion permission and only allows the request from a tap.
export async function requestPermissions(): Promise<{ motion: boolean; gps: boolean }> {
  let motion = true;
  const DME = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
  if (typeof DME?.requestPermission === "function") {
    motion = (await DME.requestPermission().catch(() => "denied")) === "granted";
  }
  const gps = await new Promise<boolean>((resolve) =>
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { enableHighAccuracy: true, timeout: 15000 },
    ),
  );
  return { motion, gps };
}

function distanceM(a: GpsFix, b: GpsFix) {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[2] - a[2]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type RecorderState = {
  session: RideSession;
  lastGps?: GpsFix;
  wakeLock: "active" | "released" | "unsupported";
};

export class RideRecorder {
  private session: RideSession;
  private motion: MotionSample[] = [];
  private gps: GpsFix[] = [];
  private seq = 0;
  private lastSampleAt = 0;
  private lastFix?: GpsFix;
  private watchId?: number;
  private flushTimer?: ReturnType<typeof setInterval>;
  private wakeLock?: WakeLockSentinel;
  private wakeState: RecorderState["wakeLock"] = "released";
  private listeners = new Set<(s: RecorderState) => void>();

  constructor(session?: RideSession) {
    this.session = session ?? {
      id: crypto.randomUUID(),
      startedAt: Date.now(),
      status: "recording",
      gaps: [],
      stats: { motionSamples: 0, gpsFixes: 0, distanceM: 0 },
    };
  }

  subscribe(fn: (s: RecorderState) => void) {
    this.listeners.add(fn);
    fn(this.state());
    return () => this.listeners.delete(fn);
  }

  private state(): RecorderState {
    return { session: this.session, lastGps: this.lastFix, wakeLock: this.wakeState };
  }

  private emit() {
    for (const fn of this.listeners) fn(this.state());
  }

  async start() {
    // A resumed session (app reloaded mid-shift) records the downtime as a gap.
    const open = this.session.gaps.at(-1);
    if (open && open.to === undefined) open.to = Date.now();
    await putSession(this.session);

    window.addEventListener("devicemotion", this.onMotion);
    this.watchId = navigator.geolocation.watchPosition(this.onPosition, undefined, {
      enableHighAccuracy: true,
      maximumAge: 0,
    });
    document.addEventListener("visibilitychange", this.onVisibility);
    this.flushTimer = setInterval(() => void this.flush(), FLUSH_MS);
    await this.acquireWakeLock();
    this.emit();
  }

  async stop() {
    window.removeEventListener("devicemotion", this.onMotion);
    if (this.watchId !== undefined) navigator.geolocation.clearWatch(this.watchId);
    document.removeEventListener("visibilitychange", this.onVisibility);
    clearInterval(this.flushTimer);
    await this.wakeLock?.release().catch(() => {});
    await this.flush();
    this.session = { ...this.session, endedAt: Date.now(), status: "pending" };
    await putSession(this.session);
    this.emit();
    return this.session;
  }

  private onMotion = (e: DeviceMotionEvent) => {
    const now = Date.now();
    if (now - this.lastSampleAt < SAMPLE_MS) return;
    this.lastSampleAt = now;
    const a = e.accelerationIncludingGravity;
    const r = e.rotationRate;
    if (!a) return;
    this.motion.push([now, a.x ?? 0, a.y ?? 0, a.z ?? 0, r?.alpha ?? 0, r?.beta ?? 0, r?.gamma ?? 0]);
  };

  private onPosition = (p: GeolocationPosition) => {
    const fix: GpsFix = [
      p.timestamp,
      p.coords.latitude,
      p.coords.longitude,
      p.coords.accuracy,
      p.coords.speed,
      p.coords.heading,
    ];
    // Ignore jitter from poor fixes when adding up distance.
    if (this.lastFix && fix[3] < 50) this.session.stats.distanceM += distanceM(this.lastFix, fix);
    this.lastFix = fix;
    this.gps.push(fix);
    this.session.stats.gpsFixes++;
    this.emit();
  };

  private onVisibility = () => {
    if (document.visibilityState === "hidden") {
      // Browsers stop sensors and GPS here, so the gap is recorded honestly.
      this.session.gaps.push({ from: Date.now() });
      this.wakeState = "released";
    } else {
      const open = this.session.gaps.at(-1);
      if (open && open.to === undefined) open.to = Date.now();
      void this.acquireWakeLock(); // the lock is dropped whenever the page is hidden
    }
    void putSession(this.session);
    this.emit();
  };

  private async acquireWakeLock() {
    if (!("wakeLock" in navigator)) {
      this.wakeState = "unsupported";
      return;
    }
    try {
      this.wakeLock = await navigator.wakeLock.request("screen");
      this.wakeState = "active";
      this.wakeLock.addEventListener("release", () => {
        this.wakeState = "released";
        this.emit();
      });
    } catch {
      this.wakeState = "released";
    }
    this.emit();
  }

  private async flush() {
    if (this.motion.length === 0 && this.gps.length === 0) return;
    const chunk = { sessionId: this.session.id, seq: this.seq++, motion: this.motion, gps: this.gps };
    this.session.stats.motionSamples += this.motion.length;
    this.motion = [];
    this.gps = [];
    await addChunk(chunk);
    await putSession(this.session);
    this.emit();
  }
}
