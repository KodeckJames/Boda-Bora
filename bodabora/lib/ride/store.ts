import { openDB, type DBSchema, type IDBPDatabase } from "idb";

// On-phone storage for recorded shifts. Data stays here until it's uploaded.

export type SessionStatus = "recording" | "pending" | "uploading" | "uploaded" | "failed";

export type RideSession = {
  id: string;
  startedAt: number;
  endedAt?: number;
  status: SessionStatus;
  // Periods when the app was hidden or the screen was off, so no data was recorded.
  gaps: { from: number; to?: number }[];
  stats: { motionSamples: number; gpsFixes: number; distanceM: number };
  uploadKey?: string;
  error?: string;
};

// Motion sample: [t, ax, ay, az, rotAlpha, rotBeta, rotGamma] (m/s², °/s, gravity included).
export type MotionSample = [number, number, number, number, number, number, number];
// GPS fix: [t, lat, lng, accuracyM, speedMs | null, heading | null].
export type GpsFix = [number, number, number, number, number | null, number | null];

export type Chunk = { sessionId: string; seq: number; motion: MotionSample[]; gps: GpsFix[] };

interface RideDB extends DBSchema {
  sessions: { key: string; value: RideSession; indexes: { by_status: SessionStatus } };
  chunks: { key: number; value: Chunk; indexes: { by_session: string } };
}

let dbPromise: Promise<IDBPDatabase<RideDB>> | undefined;

function db() {
  dbPromise ??= openDB<RideDB>("bodabora-rides", 1, {
    upgrade(d) {
      d.createObjectStore("sessions", { keyPath: "id" }).createIndex("by_status", "status");
      d.createObjectStore("chunks", { autoIncrement: true }).createIndex("by_session", "sessionId");
    },
  });
  return dbPromise;
}

export async function putSession(session: RideSession) {
  await (await db()).put("sessions", session);
}

export async function getSession(id: string) {
  return (await db()).get("sessions", id);
}

export async function listSessions() {
  const all = await (await db()).getAll("sessions");
  return all.sort((a, b) => b.startedAt - a.startedAt);
}

export async function addChunk(chunk: Chunk) {
  await (await db()).add("chunks", chunk);
}

export async function getChunks(sessionId: string) {
  const chunks = await (await db()).getAllFromIndex("chunks", "by_session", sessionId);
  return chunks.sort((a, b) => a.seq - b.seq);
}

// Free phone storage once the server has the data.
export async function deleteChunks(sessionId: string) {
  const d = await db();
  const tx = d.transaction("chunks", "readwrite");
  for (const key of await tx.store.index("by_session").getAllKeys(sessionId)) {
    await tx.store.delete(key);
  }
  await tx.done;
}
