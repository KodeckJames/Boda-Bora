"use client";

import { useActionState } from "react";
import { saveRiderProfile, type ActionState } from "@/lib/actions";
import type { Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

type Defaults = { name: string; bike_reg: string; phone: string };

export function OnboardingForm({ lang, editing, defaults }: { lang: Locale; editing: boolean; defaults: Defaults }) {
  const { t } = useI18n();
  const o = t.onboarding;
  const [state, action, pending] = useActionState<ActionState, FormData>(saveRiderProfile, {});
  const err = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5 rounded-3xl border border-line bg-surface p-6 shadow-sm" noValidate>
      <input type="hidden" name="lang" value={lang} />

      <Field label={o.name} hint={o.nameHint} error={err.name}>
        <input
          name="name"
          defaultValue={defaults.name}
          autoComplete="name"
          required
          maxLength={100}
          className="input"
          aria-invalid={!!err.name}
        />
      </Field>

      <Field label={o.plate} hint={o.plateHint} error={err.bike_reg}>
        <input
          name="bike_reg"
          defaultValue={defaults.bike_reg}
          placeholder="KMFB 412X"
          autoCapitalize="characters"
          autoComplete="off"
          required
          maxLength={12}
          className="input uppercase tracking-wider"
          aria-invalid={!!err.bike_reg}
        />
      </Field>

      <Field label={o.phone} hint={editing ? o.phoneLocked : o.phoneHint} error={err.phone}>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={defaults.phone}
          placeholder="0712 345 678"
          autoComplete="tel"
          required={!editing}
          disabled={editing}
          className="input disabled:opacity-60"
          aria-invalid={!!err.phone}
        />
      </Field>

      {state.error && (
        <p role="alert" className="rounded-xl bg-danger/5 p-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center rounded-full bg-ink font-semibold text-white transition-colors hover:bg-ink/90 disabled:opacity-60"
      >
        {pending ? o.saving : editing ? o.save : o.submit}
      </button>
    </form>
  );
}

function Field({ label, hint, error, children }: { label: string; hint: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <span className="mt-1.5 block">{children}</span>
      {error ? (
        <span role="alert" className="mt-1 block text-xs text-danger">
          {error}
        </span>
      ) : (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      )}
    </label>
  );
}
