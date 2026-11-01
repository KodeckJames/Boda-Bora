import { apiFetch } from "../api";
import { deleteChunks, getChunks, getSession, putSession } from "./store";

// Uploads a finished shift as gzipped NDJSON: one header line, then one line per chunk.
// The phone asks the API for a presigned URL and PUTs straight to object storage.
export async function uploadSession(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session || session.status === "recording" || session.status === "uploaded") return session;

  await putSession({ ...session, status: "uploading", error: undefined });
  try {
    const chunks = await getChunks(sessionId);
    const lines = [
      JSON.stringify({ type: "session", ...session, status: undefined, error: undefined }),
      ...chunks.map((c) => JSON.stringify({ type: "chunk", seq: c.seq, motion: c.motion, gps: c.gps })),
    ];
    const gz = await new Response(
      new Blob([lines.join("\n") + "\n"]).stream().pipeThrough(new CompressionStream("gzip")),
    ).blob();

    const { key, upload } = (await (await apiFetch("/api/trips/uploads", { method: "POST" })).json()) as {
      key: string;
      upload: { method: string; url: string };
    };
    const put = await fetch(upload.url, {
      method: upload.method,
      body: gz,
      headers: { "content-type": "application/gzip" },
    });
    if (!put.ok) throw new Error(`Upload failed (${put.status})`);

    await deleteChunks(sessionId);
    const done = { ...session, status: "uploaded" as const, uploadKey: key, error: undefined };
    await putSession(done);
    return done;
  } catch (err) {
    const failed = { ...session, status: "failed" as const, error: (err as Error).message };
    await putSession(failed);
    return failed;
  }
}
