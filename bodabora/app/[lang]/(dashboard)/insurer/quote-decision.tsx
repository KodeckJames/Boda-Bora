"use client";

import { useActionState } from "react";
import { decideQuote, type ActionState } from "@/lib/actions";
import { useI18n } from "@/lib/i18n/client";

// Price, refer or decline a pending quote request. Pricing needs a score that still clears the
// confidence bar; the API re-checks consent and confidence before accepting a quote.
export function QuoteDecision({ insurerId, quoteId, suggested, canPrice }: { insurerId: string; quoteId: string; suggested: number; canPrice: boolean }) {
  const { t } = useI18n();
  const ins = t.insurer;
  const [state, action, pending] = useActionState<ActionState, FormData>(decideQuote.bind(null, insurerId, quoteId), {});
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canPrice && (
          <>
            <label className="sr-only" htmlFor={`premium-${quoteId}`}>
              {ins.premium}
            </label>
            <input
              id={`premium-${quoteId}`}
              name="premium_ksh"
              type="number"
              min={100}
              step={100}
              defaultValue={suggested}
              className="input h-8 w-28 text-sm"
            />
            <button name="decision" value="quoted" disabled={pending} className="h-8 rounded-full bg-ink px-3 text-xs font-semibold text-white disabled:opacity-60">
              {ins.quote}
            </button>
          </>
        )}
        <button name="decision" value="referred" disabled={pending} className="h-8 rounded-full border border-line px-3 text-xs font-semibold disabled:opacity-60">
          {ins.refer}
        </button>
        <button name="decision" value="declined" disabled={pending} className="h-8 rounded-full px-2 text-xs font-semibold text-danger disabled:opacity-60">
          {ins.decline}
        </button>
      </div>
      {state.error && (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      )}
    </form>
  );
}
