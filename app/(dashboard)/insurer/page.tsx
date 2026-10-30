import type { Metadata } from "next";
import { Histogram } from "@/components/charts";
import { Badge, Button, Card, CardTitle, CoverageMeter, PageHeader, Stat, scoreTone } from "@/components/ui";
import { insurerTiers, quoteQueue, scoreDistribution } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Insurer portal" };

const statusTone = { Eligible: "safe", "Low confidence": "danger", Refer: "warn" } as const;

const ksh = (n: number) => `KSh ${n.toLocaleString("en-KE")}`;

export default function InsurerPage() {
  const total = insurerTiers.reduce((s, t) => s + t.riders, 0);
  return (
    <>
      <PageHeader
        eyebrow="Underwriting portal"
        title="Price careful riders correctly"
        description="Confidence-weighted Rider Safety Scores across partner SACCOs. Only scores with at least 60% shift coverage are used for pricing."
        actions={<Button variant="secondary">Pricing model</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Scored riders" value={total.toLocaleString("en-KE")} hint="12 SACCOs" />
        <Stat label="Pricing-grade" value="91%" hint="coverage ≥ 60%" />
        <Stat label="Flat-rate premium" value={ksh(14500)} hint="annual, third-party" />
        <Stat label="Tier A saving" value="57%" hint={<span className="text-safe">vs flat rate</span>} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardTitle>Score distribution</CardTitle>
          <Histogram data={scoreDistribution} />
        </Card>

        <Card className="overflow-hidden p-0 lg:col-span-3">
          <div className="px-5 pt-5">
            <h3 className="text-sm font-semibold">Risk tiers</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-y border-line text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-2.5 font-medium">Tier</th>
                  <th className="px-3 py-2.5 font-medium">Riders</th>
                  <th className="px-3 py-2.5 font-medium">Claim rate</th>
                  <th className="px-3 py-2.5 font-medium">Premium</th>
                  <th className="px-5 py-2.5 font-medium">vs flat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {insurerTiers.map((t) => {
                  const diff = Math.round(((t.premium - t.base) / t.base) * 100);
                  return (
                    <tr key={t.band}>
                      <td className="px-5 py-3">
                        <p className="font-semibold">{t.band}</p>
                        <p className="text-xs text-muted">Score {t.range}</p>
                      </td>
                      <td className="tabular px-3 py-3">{t.riders}</td>
                      <td className="tabular px-3 py-3">{t.claimRate}%</td>
                      <td className="tabular px-3 py-3 font-semibold">{ksh(t.premium)}</td>
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
            <h3 className="text-sm font-semibold">Quote requests</h3>
            <span className="text-xs text-muted">Shared by riders via their SACCO</span>
          </div>
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-y border-line text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-2.5 font-medium">Rider</th>
                  <th className="px-3 py-2.5 font-medium">SACCO</th>
                  <th className="px-3 py-2.5 font-medium">Score</th>
                  <th className="px-3 py-2.5 font-medium">Coverage</th>
                  <th className="px-3 py-2.5 font-medium">History</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
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
                    <td className="tabular px-3 py-3 text-muted">{q.weeks} wks</td>
                    <td className="px-3 py-3">
                      <Badge tone={statusTone[q.status as keyof typeof statusTone]}>{q.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button type="button" className="text-sm font-semibold hover:underline" disabled={q.status === "Low confidence"}>
                        {q.status === "Low confidence" ? <span className="text-muted">Wait</span> : "Quote →"}
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
