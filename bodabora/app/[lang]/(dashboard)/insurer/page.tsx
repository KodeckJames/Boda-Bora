import type { Metadata } from "next";
import { Histogram } from "@/components/charts";
import { Badge, Button, Card, CoverageMeter, PageHeader, Stat, scoreTone } from "@/components/ui";
import { format } from "@/lib/i18n/config";
import { getDictionary, getI18n } from "@/lib/i18n/server";
import { insurerTiers, quoteQueue, scoreDistribution } from "@/lib/mock-data";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).insurer.metaTitle };
}

const statusTone = { eligible: "safe", low_confidence: "danger", refer: "warn" } as const;

export default async function InsurerPage() {
  const { locale, t } = await getI18n();
  const ins = t.insurer;
  const numberLocale = locale === "sw" ? "sw-KE" : "en-KE";
  const ksh = (n: number) => `KSh ${n.toLocaleString(numberLocale)}`;
  const total = insurerTiers.reduce((s, tier) => s + tier.riders, 0);
  return (
    <>
      <PageHeader
        eyebrow={ins.eyebrow}
        title={ins.title}
        description={ins.description}
        actions={<Button variant="secondary">{ins.pricingModel}</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={ins.scoredRiders} value={total.toLocaleString(numberLocale)} hint={ins.saccosHint} />
        <Stat label={ins.pricingGrade} value="91%" hint={ins.pricingGradeHint} />
        <Stat label={ins.flatRate} value={ksh(14500)} hint={ins.flatRateHint} />
        <Stat label={ins.tierASaving} value="57%" hint={<span className="text-safe">{ins.vsFlat}</span>} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">{ins.distribution}</h3>
          <Histogram data={scoreDistribution} />
        </Card>

        <Card className="overflow-hidden p-0 lg:col-span-3">
          <div className="px-5 pt-5">
            <h3 className="text-sm font-semibold">{ins.riskTiers}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-y border-line text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-2.5 font-medium">{ins.colTier}</th>
                  <th className="px-3 py-2.5 font-medium">{ins.colRiders}</th>
                  <th className="px-3 py-2.5 font-medium">{ins.colClaimRate}</th>
                  <th className="px-3 py-2.5 font-medium">{ins.colPremium}</th>
                  <th className="px-5 py-2.5 font-medium">{ins.colVsFlat}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {insurerTiers.map((tier) => {
                  const diff = Math.round(((tier.premium - tier.base) / tier.base) * 100);
                  return (
                    <tr key={tier.tier}>
                      <td className="px-5 py-3">
                        <p className="font-semibold">{format(ins.tier, { tier: tier.tier })}</p>
                        <p className="text-xs text-muted">{format(ins.scoreRange, { range: tier.range })}</p>
                      </td>
                      <td className="tabular px-3 py-3">{tier.riders}</td>
                      <td className="tabular px-3 py-3">{tier.claimRate}%</td>
                      <td className="tabular px-3 py-3 font-semibold">{ksh(tier.premium)}</td>
                      <td className={`tabular px-5 py-3 font-semibold ${diff < 0 ? "text-safe" : "text-danger"}`}>
                        {diff > 0 ? "+" : ""}{diff}%
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
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-y border-line text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-2.5 font-medium">{ins.colRider}</th>
                  <th className="px-3 py-2.5 font-medium">{ins.colSacco}</th>
                  <th className="px-3 py-2.5 font-medium">{ins.colScore}</th>
                  <th className="px-3 py-2.5 font-medium">{ins.colCoverage}</th>
                  <th className="px-3 py-2.5 font-medium">{ins.colHistory}</th>
                  <th className="px-3 py-2.5 font-medium">{ins.colStatus}</th>
                  <th className="px-5 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {quoteQueue.map((q) => (
                  <tr key={q.rider}>
                    <td className="px-5 py-3 font-medium">{q.rider}</td>
                    <td className="px-3 py-3 text-muted">{q.sacco}</td>
                    <td className={`tabular px-3 py-3 font-bold ${scoreTone(q.score).text}`}>{q.score}</td>
                    <td className="px-3 py-3"><CoverageMeter value={q.coverage} /></td>
                    <td className="tabular px-3 py-3 text-muted">{format(ins.weeks, { n: q.weeks })}</td>
                    <td className="px-3 py-3">
                      <Badge tone={statusTone[q.status]}>{ins.status[q.status]}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button type="button" className="text-sm font-semibold hover:underline" disabled={q.status === "low_confidence"}>
                        {q.status === "low_confidence" ? <span className="text-muted">{ins.wait}</span> : ins.quote}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
