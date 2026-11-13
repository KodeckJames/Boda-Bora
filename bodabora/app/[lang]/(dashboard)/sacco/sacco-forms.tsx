"use client";

import { useActionState } from "react";
import { inviteRider, uploadShifts, type ActionState } from "@/lib/actions";
import { format } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

// Riders sign up themselves with Google; the SACCO then invites their Google email to join.
export function InviteRiderForm({ saccoId }: { saccoId: string }) {
  const { t } = useI18n();
  const s = t.sacco;
  const [state, action, pending] = useActionState<ActionState, FormData>(inviteRider.bind(null, saccoId), {});
  return (
    <form action={action} className="space-y-2">
      <label className="block text-sm font-semibold" htmlFor="invite-email">
        {s.inviteTitle}
      </label>
      <p className="text-xs text-muted">{s.inviteBody}</p>
      <div className="flex gap-2">
        <input id="invite-email" name="email" type="email" required placeholder="rider@gmail.com" className="input h-10 text-sm" />
        <button type="submit" disabled={pending} className="h-10 shrink-0 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "…" : s.invite}
        </button>
      </div>
      {state.ok && <p className="text-xs text-safe">{s.invited}</p>}
      {state.error && <p role="alert" className="text-xs text-danger">{state.error}</p>}
    </form>
  );
}

// Shift records are what coverage is checked against: "phone,starts_at,ends_at".
export function ShiftUploadForm({ saccoId }: { saccoId: string }) {
  const { t } = useI18n();
  const s = t.sacco;
  const [state, action, pending] = useActionState<ActionState, FormData>(uploadShifts.bind(null, saccoId), {});
  return (
    <form action={action} className="space-y-2">
      <label className="block text-sm font-semibold" htmlFor="shift-file">
        {s.shiftsTitle}
      </label>
      <p className="text-xs text-muted">{format(s.shiftsBody, { header: "phone,starts_at,ends_at" })}</p>
      <div className="flex gap-2">
        <input id="shift-file" name="file" type="file" accept=".csv,text/csv" required className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-black/5 file:px-3 file:py-2 file:text-sm file:font-semibold" />
        <button type="submit" disabled={pending} className="h-10 shrink-0 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "…" : s.upload}
        </button>
      </div>
      {state.ok && !state.error && <p className="text-xs text-safe">{s.uploaded}</p>}
      {state.error && <p role="alert" className="text-xs text-danger">{state.error}</p>}
    </form>
  );
}
