import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Card, CardTitle, CoverageMeter, PageHeader, Sparkline, Stat, scoreTone } from "@/components/ui";
import { format, withLocale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import { getDictionary, getI18n } from "@/lib/i18n/server";
import { fleetStats, riders, type Flag } from "@/lib/mock-data";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).sacco.metaTitle };
}

export const flagText = (t: Dictionary, f: Flag) => format(t.common.flags[f.key], f.params ?? {});

export default async function SaccoPage() {
  const { locale, t } = await getI18n();
  const s = t.sacco;
  const flagged = riders.filter((r) => r.flags.length > 0);
  const sorted = [...riders].sort((a, b) => a.score - b.score);
  const riderHref = (id: string) => withLocale(locale, `/sacco/riders/${id}`);

  return (
    <>
      <PageHeader
        eyebrow={s.eyebrow}
        title={s.title}
        description={s.description}
        actions={
          <>
            <Button variant="secondary">{s.exportCsv}</Button>
            <Button>{s.sendCoaching}</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={s.riders} value={fleetStats.riders} hint={s.ridersHint} />
        <Stat label={s.avgScore} value={fleetStats.avgScore} hint={<span className="text-safe">{s.avgScoreHint}</span>} />
        <Stat label={s.avgCoverage} value={`${fleetStats.avgCoverage}%`} hint={s.avgCoverageHint} />
        <Stat label={s.flagged} value={fleetStats.flagged} hint={s.flaggedHint} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden p-0 lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5">
            <h3 className="text-sm font-semibold">{s.ridersTable}</h3>
            <div className="flex gap-1 text-xs">
              <span className="rounded-full bg-ink px-2.5 py-1 font-medium text-white">{s.filterAll}</span>
              <span className="rounded-full px-2.5 py-1 text-muted">{s.filterFlagged}</span>
              <span className="rounded-full px-2.5 py-1 text-muted">{s.filterHighRisk}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-y border-line text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-2.5 font-medium">{s.colRider}</th>
                  <th className="px-3 py-2.5 font-medium">{s.colScore}</th>
                  <th className="px-3 py-2.5 font-medium">{s.colTrend}</th>
                  <th className="px-3 py-2.5 font-medium">{s.colCoverage}</th>
                  <th className="px-3 py-2.5 font-medium">{s.colNight}</th>
                  <th className="px-5 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sorted.map((r) => {
                  const tone = scoreTone(r.score);
                  return (
                    <tr key={r.id} className="hover:bg-black/2">
                      <td className="px-5 py-3">
                        <Link href={riderHref(r.id)} className="font-medium hover:underline">
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
                        {r.flags.length > 0 && (
                          <Badge tone={r.coverage < 60 ? "danger" : "warn"}>{format(s.flagCount, { n: r.flags.length })}</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardTitle action={<Badge tone="danger">{flagged.length}</Badge>}>{s.needsAttention}</CardTitle>
          <ul className="space-y-4">
            {flagged.map((r) => (
              <li key={r.id}>
                <Link href={riderHref(r.id)} className="block rounded-xl border border-line p-3 hover:border-ink">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.name}</span>
                    <span className={`tabular font-bold ${scoreTone(r.score).text}`}>{r.score}</span>
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {r.flags.map((f) => (
                      <li key={f.key} className="text-xs text-muted">• {flagText(t, f)}</li>
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
