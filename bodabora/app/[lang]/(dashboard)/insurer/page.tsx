import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading, loadOr } from "@/components/api-problem";
import { Histogram } from "@/components/charts";
import { OrgSwitcher } from "@/components/org-switcher";
import { Badge, Card, CoverageMeter, PageHeader, Stat, scoreTone } from "@/components/ui";
import { api, getMe, orgsFor, pickOrg } from "@/lib/api/server";
import type { Distribution, InsurerQuote, InsurerTiers, QuoteStatus, Tier } from "@/lib/api/types";
import { dateOf, ksh, number, pct } from "@/lib/format";
import { format, withLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary, getI18n } from "@/lib/i18n/server";
import { FLAT_RATE_KSH, TIER_PREMIUM_KSH, tierOf, vsFlat } from "@/lib/pricing";
import { QuoteDecision } from "./quote-decision";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).insurer.metaTitle };
}

const statusTone: Record<QuoteStatus, "safe" | "warn" | "danger" | "neutral"> = {
  pending: "warn",
  quoted: "safe",
  referred: "neutral",
  declined: "danger",
};

async function Portal({ locale, searchParams }: { locale: Locale; searchParams: Promise<{ org?: string }> }) {
  const { t } = await getI18n();
  const ins = t.insurer;
  const { org } = await searchParams;
  const base = withLocale(locale, "/insurer");

  const result = await loadOr(
    async () => {
      const me = await getMe();
      if (me.profile.role !== "insurer_analyst" && me.profile.role !== "admin") return { me, orgs: [], insurer: null } as const;
      const orgs = await orgsFor(me, "insurer");
      const insurer = pickOrg(orgs, org);
      if (!insurer) return { me, orgs, insurer: null } as const;
      const [tiers, distribution, quotes] = await Promise.all([
        api<InsurerTiers>(`/api/insurer/${insurer.id}/tiers`),
        api<Distribution>(`/api/insurer/${insurer.id}/distribution`),
        api<InsurerQuote[]>(`/api/insurer/${insurer.id}/quotes`),
      ]);
      return { me, orgs, insurer, tiers, distribution, quotes } as const;
    },
    { locale, t, next: `${base}${org ? `?org=${org}` : ""}` },
  );
  if (!result.ok) return result.problem;
  const data = result.data;

  if (!data.insurer) {
    return (
      <>
        <PageHeader eyebrow={ins.eyebrow} title={ins.title} />
        <Card>
          <p className="font-semibold">{ins.noInsurerTitle}</p>
          <p className="mt-1 text-sm text-muted">{format(ins.noInsurerBody, { email: data.me.profile.email ?? "" })}</p>
        </Card>
      </>
    );
  }

  const { insurer, tiers, distribution, quotes, orgs } = data;
  // Pending requests first, newest first within each group (the API sorts by date).
  const sorted = [...quotes].sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"));
  const tierRange = (tier: Tier, i: number) => {
    const max = i === 0 ? 100 : tiers.tiers[i - 1]!.min_score - 1;
    return `${tiers.tiers[i]!.min_score}–${max}`;
  };
  const histogram = distribution.buckets.filter((b) => b.from >= 30).map((b) => ({ bucket: String(b.from), count: b.riders }));
  // Fold anything under 30 into the first bar so no rider disappears from the chart.
  const under30 = distribution.buckets.filter((b) => b.from < 30).reduce((s, b) => s + b.riders, 0);
  if (histogram[0]) histogram[0] = { ...histogram[0], count: histogram[0].count + under30 };

  return (
    <>
      <OrgSwitcher orgs={orgs} current={insurer.id} basePath={base} />
      <PageHeader eyebrow={insurer.name} title={ins.title} description={ins.description} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={ins.scoredRiders} value={number(tiers.eligible_riders, locale)} hint={ins.scoredRidersHint} />
        <Stat label={ins.belowConfidence} value={number(tiers.below_confidence, locale)} hint={format(ins.belowConfidenceHint, { pct: pct(tiers.min_confidence)! })} />
        <Stat label={ins.flatRate} value={ksh(FLAT_RATE_KSH, locale)} hint={ins.flatRateHint} />
        <Stat label={ins.tierASaving} value={`${Math.abs(vsFlat(TIER_PREMIUM_KSH.A))}%`} hint={<span className="text-safe">{ins.vsFlat}</span>} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">{ins.distribution}</h3>
          {distribution.riders === 0 ? <p className="text-sm text-muted">{ins.noScores}</p> : <Histogram data={histogram} />}
        </Card>

        <Card className="overflow-hidden p-0 lg:col-span-3">
          <div className="flex items-center justify-between px-5 pt-5">
            <h3 className="text-sm font-semibold">{ins.riskTiers}</h3>
            <span className="text-xs text-muted">{ins.indicative}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-y border-line text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-2.5 font-medium">{ins.colTier}</th>
                  <th className="px-3 py-2.5 font-medium">{ins.colRiders}</th>
                  <th className="px-3 py-2.5 font-medium">{ins.colAvgScore}</th>
                  <th className="px-3 py-2.5 font-medium">{ins.colPremium}</th>
                  <th className="px-5 py-2.5 font-medium">{ins.colVsFlat}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tiers.tiers.map((tier, i) => {
                  const premium = TIER_PREMIUM_KSH[tier.tier];
                  const diff = vsFlat(premium);
                  return (
                    <tr key={tier.tier}>
                      <td className="px-5 py-3">
                        <p className="font-semibold">{format(ins.tier, { tier: tier.tier })}</p>
                        <p className="text-xs text-muted">{format(ins.scoreRange, { range: tierRange(tier.tier, i) })}</p>
                      </td>
                      <td className="tabular px-3 py-3">{tier.riders}</td>
                      <td className="tabular px-3 py-3">{tier.avg_score === null ? "—" : Math.round(tier.avg_score)}</td>
                      <td className="tabular px-3 py-3 font-semibold">{ksh(premium, locale)}</td>
                      <td className={`tabular px-5 py-3 font-semibold ${diff < 0 ? "text-safe" : "text-danger"}`}>
                        {diff > 0 ? "+" : ""}
                        {diff}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden p-0 lg:col-span-5">
          <div className="flex items-center justify-between px-5 pt-5">
            <h3 className="text-sm font-semibold">{ins.quoteRequests}</h3>
            <span className="text-xs text-muted">{ins.sharedBy}</span>
          </div>
          {sorted.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">{ins.noQuotes}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="mt-3 w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-y border-line text-left text-xs uppercase tracking-wider text-muted">
                    <th className="px-5 py-2.5 font-medium">{ins.colRider}</th>
                    <th className="px-3 py-2.5 font-medium">{ins.colSacco}</th>
                    <th className="px-3 py-2.5 font-medium">{ins.colScore}</th>
                    <th className="px-3 py-2.5 font-medium">{ins.colCoverage}</th>
                    <th className="px-3 py-2.5 font-medium">{ins.colStatus}</th>
                    <th className="px-5 py-2.5 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sorted.map((q) => {
                    const snap = q.score_snapshot;
                    const coverage = pct(snap.coverage);
                    return (
                      <tr key={q.id}>
                        <td className="px-5 py-3">
                          <p className="font-medium">{q.rider_name}</p>
                          <p className="text-xs text-muted">{dateOf(q.created_at, locale)}</p>
                        </td>
                        <td className="px-3 py-3 text-muted">{q.sacco_name ?? "—"}</td>
                        <td className="px-3 py-3">
                          <span className={`tabular font-bold ${scoreTone(snap.score).text}`}>{Math.round(snap.score)}</span>
                          <span className="ml-1.5 text-xs text-muted">{format(ins.tier, { tier: snap.tier })}</span>
                        </td>
                        <td className="px-3 py-3">{coverage === null ? <span className="text-muted">—</span> : <CoverageMeter value={coverage} />}</td>
                        <td className="px-3 py-3">
                          <Badge tone={q.status === "pending" && !q.eligible ? "danger" : statusTone[q.status]}>
                            {q.status === "pending" && !q.eligible ? ins.lowConfidence : ins.status[q.status]}
                          </Badge>
                          {q.status === "quoted" && q.premium_ksh && <p className="mt-1 text-xs text-muted">{ksh(q.premium_ksh, locale)}</p>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {q.status === "pending" && (
                            <QuoteDecision
                              insurerId={insurer.id}
                              quoteId={q.id}
                              suggested={TIER_PREMIUM_KSH[tierOf(q.current_score ?? snap.score)]}
                              canPrice={q.eligible}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

export default async function InsurerPage({ searchParams }: PageProps<"/[lang]/insurer">) {
  const { locale } = await getI18n();
  return (
    <Suspense fallback={<Loading className="h-[560px]" />}>
      <Portal locale={locale} searchParams={searchParams as Promise<{ org?: string }>} />
    </Suspense>
  );
}
