import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Card, CardTitle, CoverageMeter, PageHeader, Sparkline, Stat, scoreTone } from "@/components/ui";
import { fleetStats, riders } from "@/lib/mock-data";

export const metadata: Metadata = { title: "SACCO fleet" };

export default function SaccoPage() {
  const flagged = riders.filter((r) => r.flags.length > 0);
  const sorted = [...riders].sort((a, b) => a.score - b.score);

  return (
    <>
      <PageHeader
        eyebrow="Roysambu Boda SACCO"
        title="Fleet safety"
        description="Scores for every rider you're liable for, weighted by how much of their shift was actually logged."
        actions={
          <>
            <Button variant="secondary">Export CSV</Button>
            <Button>Send coaching</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Riders" value={fleetStats.riders} hint="3 stages" />
        <Stat label="Avg score" value={fleetStats.avgScore} hint={<span className="text-safe">▲ 2 vs last week</span>} />
        <Stat label="Avg coverage" value={`${fleetStats.avgCoverage}%`} hint="of shift hours traced" />
        <Stat label="Flagged" value={fleetStats.flagged} hint="need review" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden p-0 lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5">
            <h3 className="text-sm font-semibold">Riders</h3>
            <div className="flex gap-1 text-xs">
              <span className="rounded-full bg-ink px-2.5 py-1 font-medium text-white">All</span>
              <span className="rounded-full px-2.5 py-1 text-muted">Flagged</span>
              <span className="rounded-full px-2.5 py-1 text-muted">High risk</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-y border-line text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-2.5 font-medium">Rider</th>
                  <th className="px-3 py-2.5 font-medium">Score</th>
                  <th className="px-3 py-2.5 font-medium">Trend</th>
                  <th className="px-3 py-2.5 font-medium">Coverage</th>
                  <th className="px-3 py-2.5 font-medium">Night</th>
                  <th className="px-5 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sorted.map((r) => {
                  const tone = scoreTone(r.score);
                  return (
                    <tr key={r.id} className="hover:bg-black/2">
                      <td className="px-5 py-3">
                        <Link href={`/sacco/riders/${r.id}`} className="font-medium hover:underline">
                          {r.name}
                        </Link>
                        <p className="text-xs text-muted">{r.stage} · {r.bike}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`tabular text-base font-bold ${tone.text}`}>{r.score}</span>
                        <span className={`ml-1.5 text-xs ${r.scoreDelta >= 0 ? "text-safe" : "text-danger"}`}>
                          {r.scoreDelta >= 0 ? "+" : ""}{r.scoreDelta}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Sparkline values={r.trend} width={72} height={24} stroke={tone.stroke} />
                      </td>
                      <td className="px-3 py-3"><CoverageMeter value={r.coverage} /></td>
                      <td className="tabular px-3 py-3 text-muted">{r.nightShare}%</td>
                      <td className="px-5 py-3 text-right">
                        {r.flags.length > 0 && <Badge tone={r.coverage < 60 ? "danger" : "warn"}>{r.flags.length} flag</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardTitle action={<Badge tone="danger">{flagged.length}</Badge>}>Needs attention</CardTitle>
          <ul className="space-y-4">
            {flagged.map((r) => (
              <li key={r.id}>
                <Link href={`/sacco/riders/${r.id}`} className="block rounded-xl border border-line p-3 hover:border-ink">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.name}</span>
                    <span className={`tabular font-bold ${scoreTone(r.score).text}`}>{r.score}</span>
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {r.flags.map((f) => (
                      <li key={f} className="text-xs text-muted">• {f}</li>
                    ))}
                  </ul>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
