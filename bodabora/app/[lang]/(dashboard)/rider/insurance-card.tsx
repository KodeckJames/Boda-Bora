import { ActionButton } from "@/components/action-button";
import { Badge, Card, CardTitle } from "@/components/ui";
import { requestQuote, shareScore, stopSharing } from "@/lib/actions";
import type { Consent, Insurer, RiderQuote } from "@/lib/api/types";
import { ksh } from "@/lib/format";
import { format, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

const MIN_CONFIDENCE = 0.6; // backend SCORING.insurerMinConfidence

// The rider decides which insurers see their score, and asks them for quotes.
export function InsuranceCard({
  insurers,
  consents,
  quotes,
  confidence,
  locale,
  t,
}: {
  insurers: Insurer[];
  consents: Consent[];
  quotes: RiderQuote[];
  confidence: number | null; // null = no score yet
  locale: Locale;
  t: Dictionary;
}) {
  const i = t.insurance;
  const active = consents.filter((c) => !c.revoked_at);
  const anyInsurer = active.find((c) => c.insurer_id === null);

  return (
    <Card>
      <CardTitle>{i.title}</CardTitle>
      <p className="-mt-2 mb-4 text-sm text-muted">{i.body}</p>
      {confidence !== null && confidence < MIN_CONFIDENCE && (
        <p className="mb-4 rounded-xl bg-warn/10 p-3 text-sm text-[#9a5d00]">{format(i.lowConfidence, { pct: Math.round(confidence * 100) })}</p>
      )}
      {insurers.length === 0 ? (
        <p className="text-sm text-muted">{i.noInsurers}</p>
      ) : (
        <ul className="divide-y divide-line">
          {insurers.map((ins) => {
            const consent = active.find((c) => c.insurer_id === ins.id) ?? anyInsurer;
            const quote = quotes.find((q) => q.insurer_id === ins.id);
            const canRequest = !!consent && confidence !== null && quote?.status !== "pending";
            return (
              <li key={ins.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{ins.name}</p>
                  <p className="text-xs text-muted">
                    {quote
                      ? quote.status === "quoted" && quote.premium_ksh
                        ? format(i.quoted, { premium: ksh(quote.premium_ksh, locale) })
                        : i.quoteStatus[quote.status]
                      : consent
                        ? i.sharing
                        : i.notSharing}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {consent && <Badge tone="safe">{i.shared}</Badge>}
                  {canRequest && (
                    <ActionButton action={requestQuote.bind(null, ins.id)} variant="primary" small>
                      {i.requestQuote}
                    </ActionButton>
                  )}
                  {consent ? (
                    <ActionButton action={stopSharing.bind(null, consent.id)} small>
                      {i.stop}
                    </ActionButton>
                  ) : (
                    <ActionButton action={shareScore.bind(null, ins.id)} variant="hivis" small>
                      {i.share}
                    </ActionButton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
