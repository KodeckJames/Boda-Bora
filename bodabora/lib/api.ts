// Client for the Boda Bora API (the Hono backend on Neon Functions), from the browser.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Short-lived (15 min) Neon Auth JWT for the signed-in user; the API verifies it against
// the branch's JWKS. Null when signed out.
//
// Fetched from the same-origin auth proxy directly: the Neon client's authClient.token()
// answers from its cached session once one is loaded (no `token` field), so it reports
// "signed out" for a signed-in user.
export async function getToken(): Promise<string | null> {
  const res = await fetch("/api/auth/token", { credentials: "same-origin", cache: "no-store" }).catch(() => null);
  if (!res?.ok) return null;
  const body = (await res.json().catch(() => null)) as { token?: string } | null;
  return body?.token ?? null;
}

export class NotSignedInError extends Error {
  constructor() {
    super("Sign in to upload your shifts");
  }
}

// The API's 409 for an account without a rider profile yet.
export class NoRiderProfileError extends Error {
  constructor() {
    super("Finish rider registration first");
  }
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = await getToken();
  if (!token) throw new NotSignedInError();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status === 409 && body.error === new NoRiderProfileError().message) throw new NoRiderProfileError();
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res;
}
