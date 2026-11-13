"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError, getMe, json } from "@/lib/api/server";
import { hasLocale, withLocale } from "@/lib/i18n/config";
import en from "@/lib/i18n/dictionaries/en";
import sw from "@/lib/i18n/dictionaries/sw";

// Server Actions behind the app's forms. Each one calls the API as the signed-in user, so the
// API's own role and ownership checks apply; nothing here grants access by itself.

export type ActionState = { error?: string; fieldErrors?: Partial<Record<string, string>>; ok?: boolean };

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const failure = (err: unknown): ActionState => {
  if (err instanceof ApiError) {
    const fieldErrors = Object.fromEntries(err.issues.filter((i) => i.path).map((i) => [i.path, i.message]));
    return { error: err.message, fieldErrors };
  }
  throw err;
};

// Same rules as the API (backend/src/lib/plate.ts, phone.ts), checked here first so the
// messages are in the rider's language.
const PLATE = /^KM[A-Z]{2}\d{3}[A-Z]$/;
const PHONE = /^(?:\+?254|0)?[17]\d{8}$/;

// ---------- Rider profile (onboarding) ----------

export async function saveRiderProfile(_prev: ActionState, form: FormData): Promise<ActionState> {
  const lang = text(form, "lang");
  const t = (lang === "sw" ? sw : en).onboarding;
  const name = text(form, "name").replace(/\s+/g, " ");
  const plate = text(form, "bike_reg").toUpperCase().replace(/[\s-]/g, "");
  const phone = text(form, "phone").replace(/[\s()-]/g, "");

  const me = await getMe();
  const creating = !me.rider;
  const fieldErrors: Record<string, string> = {};
  if (name.split(" ").length < 2 || name.length < 3) fieldErrors.name = t.nameError;
  if (!PLATE.test(plate)) fieldErrors.bike_reg = t.plateError;
  if (creating && !PHONE.test(phone)) fieldErrors.phone = t.phoneError;
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  try {
    if (creating) await api("/api/me/rider", { method: "POST", ...json({ name, phone, bike_reg: plate }) });
    else await api("/api/me/rider", { method: "PATCH", ...json({ name, bike_reg: plate }) });
  } catch (err) {
    return failure(err);
  }
  redirect(withLocale(hasLocale(lang) ? lang : "en", "/rider"));
}

// ---------- Sharing the score with insurers ----------

export async function shareScore(insurerId: string): Promise<ActionState> {
  try {
    await api("/api/me/consents", { method: "POST", ...json({ insurer_id: insurerId }) });
  } catch (err) {
    return failure(err);
  }
  refresh();
  return { ok: true };
}

export async function stopSharing(consentId: string): Promise<ActionState> {
  try {
    await api(`/api/me/consents/${encodeURIComponent(consentId)}`, { method: "DELETE" });
  } catch (err) {
    return failure(err);
  }
  refresh();
  return { ok: true };
}

export async function requestQuote(insurerId: string): Promise<ActionState> {
  try {
    await api("/api/me/quotes", { method: "POST", ...json({ insurer_id: insurerId }) });
  } catch (err) {
    return failure(err);
  }
  refresh();
  return { ok: true };
}

// ---------- SACCO ----------

export async function inviteRider(saccoId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await api(`/api/sacco/${encodeURIComponent(saccoId)}/riders/invite`, { method: "POST", ...json({ email: text(form, "email") }) });
  } catch (err) {
    return failure(err);
  }
  return { ok: true };
}

export async function uploadShifts(saccoId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file" };
  if (file.size > 1024 * 1024) return { error: "The file is larger than 1 MB" };
  try {
    const result = await api<{ saved: number; rejected: { index: number; reason: string }[] }>(
      `/api/sacco/${encodeURIComponent(saccoId)}/shifts/csv`,
      { method: "POST", body: await file.text(), headers: { "content-type": "text/csv" } },
    );
    refresh();
    return { ok: true, error: result.rejected.length ? `${result.saved} saved, ${result.rejected.length} rejected` : undefined };
  } catch (err) {
    return failure(err);
  }
}

export async function regenerateCoaching(riderId: string): Promise<ActionState> {
  try {
    await api(`/api/coaching/riders/${encodeURIComponent(riderId)}/generate`, { method: "POST" });
  } catch (err) {
    return failure(err);
  }
  refresh();
  return { ok: true };
}

// ---------- Insurer ----------

// One form, three buttons: name="decision" value="quoted" | "referred" | "declined".
export async function decideQuote(insurerId: string, quoteId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const decision = text(form, "decision");
  if (decision !== "quoted" && decision !== "referred" && decision !== "declined") return { error: "Choose a decision" };
  const premium = Number(text(form, "premium_ksh"));
  if (decision === "quoted" && !(premium >= 100)) return { error: "Enter a premium" };
  try {
    await api(`/api/insurer/${encodeURIComponent(insurerId)}/quotes/${encodeURIComponent(quoteId)}/decision`, {
      method: "POST",
      ...json({ decision, ...(decision === "quoted" ? { premium_ksh: Math.round(premium) } : {}) }),
    });
  } catch (err) {
    return failure(err);
  }
  refresh();
  return { ok: true };
}
