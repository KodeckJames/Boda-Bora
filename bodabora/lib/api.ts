// Client for the Boda Bora API (the Hono backend on Neon Functions).
import { authClient } from "@/lib/auth/client";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Short-lived (15 min) Neon Auth JWT for the signed-in user; the API verifies it against
// the branch's JWKS. Null when signed out.
export async function getToken(): Promise<string | null> {
  const { data, error } = await authClient.token();
  if (error || !data?.token) return null;
  return data.token;
}

export class NotSignedInError extends Error {
  constructor() {
    super("Sign in to upload your shifts");
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
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res;
}
