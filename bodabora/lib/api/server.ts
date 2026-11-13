import { cache } from "react";
import { auth } from "@/lib/auth/server";
import type { Me } from "./types";

// Calls to the Boda Bora API from Server Components and Server Actions, as the signed-in user.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// The API answers errors as { error, issues?: [{ path, message }] }.
export type ApiIssue = { path: string; message: string };
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly issues: ApiIssue[] = [],
  ) {
    super(message);
  }
}

// GET /token on the Neon Auth server. The SDK proxies it but its type comes through as unknown.
type TokenCall = () => Promise<{ data: { token?: string } | null }>;

// The user's short-lived Neon Auth JWT, once per request.
const bearer = cache(async () => {
  const { data } = await (auth.token as TokenCall)();
  if (!data?.token) throw new ApiError(401, "Not signed in");
  return data.token;
});

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await bearer();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init.body && typeof init.body === "string" ? { "content-type": "application/json" } : {}),
      ...init.headers,
      authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; issues?: ApiIssue[] };
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`, body.issues);
  }
  return (await res.json()) as T;
}

export const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

// Who's signed in, their role and what they can reach. Once per request.
export const getMe = cache(() => api<Me>("/api/me"));

// A rider needs a full name and number plate before using the app.
export const needsRiderProfile = (me: Me) => !me.rider || !me.rider.bike_reg || me.rider.name.trim().split(/\s+/).length < 2;

// The SACCOs or insurers this user works for. Platform admins can open any of them.
export async function orgsFor(me: Me, kind: "sacco" | "insurer"): Promise<{ id: string; name: string }[]> {
  if (me.profile.role === "admin") return api<{ id: string; name: string }[]>(kind === "sacco" ? "/api/admin/saccos" : "/api/admin/insurers");
  if (kind === "insurer") {
    const all = await api<{ id: string; name: string }[]>("/api/insurer");
    return all.filter((i) => me.insurer_ids.includes(i.id));
  }
  return Promise.all(me.sacco_ids.map((id) => api<{ id: string; name: string }>(`/api/sacco/${id}`)));
}

// ?org=<id> when it's one of theirs, else the first.
export const pickOrg = <T extends { id: string }>(orgs: T[], requested: string | undefined) =>
  orgs.find((o) => o.id === requested) ?? orgs[0] ?? null;
