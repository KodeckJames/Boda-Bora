import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Loading, loadOr } from "@/components/api-problem";
import { OrgSwitcher } from "@/components/org-switcher";
import { flagText } from "@/components/score-parts";
import { Badge, Card, CardTitle, CoverageMeter, PageHeader, Sparkline, Stat, scoreTone } from "@/components/ui";
import { api, getMe, orgsFor, pickOrg } from "@/lib/api/server";
import type { FlaggedRider, Fleet, Sacco } from "@/lib/api/types";
import { pct } from "@/lib/format";
import { format, withLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary, getI18n } from "@/lib/i18n/server";
import { InviteRiderForm, ShiftUploadForm } from "./sacco-forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).sacco.metaTitle };
}

const FILTERS = ["all", "flagged", "high"] as const;
type Filter = (typeof FILTERS)[number];

async function FleetView({ locale, searchParams }: { locale: Locale; searchParams: Promise<{ org?: string; filter?: string }> }) {
  const { t } = await getI18n();
  const s = t.sacco;
  const { org, filter: rawFilter } = await searchParams;
  const filter: Filter = FILTERS.includes(rawFilter as Filter) ? (rawFilter as Filter) : "all";
  const base = withLocale(locale, "/sacco");
  const here = `${base}${org ? `?org=${org}` : ""}`;

  const result = await loadOr(
    async () => {
      const me = await getMe();
      if (me.profile.role !== "sacco_admin" && me.profile.role !== "admin") return { me, orgs: [], sacco: null } as const;
      const orgs = await orgsFor(me, "sacco");
      const chosen = pickOrg(orgs, org);
      if (!chosen) return { me, orgs, sacco: null } as const;
      const [sacco, fleet, flags] = await Promise.all([
        api<Sacco>(`/api/sacco/${chosen.id}`),
        api<Fleet>(`/api/sacco/${chosen.id}/fleet`),
        api<FlaggedRider[]>(`/api/sacco/${chosen.id}/flags`),
      ]);
      return { me, orgs, sacco, fleet, flags } as const;
    },
    { locale, t, next: here },
  );
  if (!result.ok) return result.problem;
  const data = result.data;

  if (!data.sacco) {
    return (
      <>
        <PageHeader eyebrow={s.eyebrow} title={s.title} />
        <Card>
          <p className="font-semibold">{s.noSaccoTitle}</p>
          <p className="mt-1 text-sm text-muted">{format(s.noSaccoBody, { email: data.me.profile.email ?? "" })}</p>
        </Card>
      </>
    );
  }

  const { sacco, fleet, flags, orgs } = data;
  const riderHref = (id: string) => `${withLocale(locale, `/sacco/riders/${id}`)}${org ? `?org=${org}` : ""}`;
  const filterHref = (f: Filter) => `${base}?${new URLSearchParams({ ...(org ? { org } : {}), ...(f !== "all" ? { filter: f } : {}) })}`;
  const flaggedIds = new Set(flags.map((f) => f.rider_id));
  const shown = fleet.riders
    .filter((r) => filter === "all" || (filter === "flagged" ? flaggedIds.has(r.id) : r.score !== null && r.score < 55))
    // Riders who need attention first: lowest scores, then the unscored.
    .sort((a, b) => (a.score ?? 101) - (b.score ?? 101));

  return (
    <>
      <OrgSwitcher orgs={orgs} current={sacco.id} basePath={base} />
      <PageHeader eyebrow={sacco.name} title={s.title} description={s.description} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={s.riders} value={fleet.stats.riders} hint={format(s.ridersHint, { n: sacco.stages.length })} />
        <Stat label={s.avgScore} value={fleet.stats.avg_score === null ? "—" : Math.round(fleet.stats.avg_score)} hint={format(s.avgScoreHint, { n: fleet.stats.scored })} />
        <Stat label={s.avgCoverage} value={fleet.stats.avg_coverage === null ? "—" : `${Math.round(fleet.stats.avg_coverage)}%`} hint={s.avgCoverageHint} />
        <Stat label={s.flagged} value={fleet.stats.flagged} hint={s.flaggedHint} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden p-0 lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5">
            <h3 className="text-sm font-semibold">{s.ridersTable}</h3>
            <nav className="flex gap-1 text-xs">
              {FILTERS.map((f) => (
                <Link
                  key={f}
                  href={filterHref(f)}
                  className={`rounded-full px-2.5 py-1 font-medium ${f === filter ? "bg-ink text-white" : "text-muted hover:text-foreground"}`}
                >
                  {{ all: s.filterAll, flagged: s.filterFlagged, high: s.filterHighRisk }[f]}
                </Link>
              ))}
            </nav>
          </div>
          {shown.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">{fleet.riders.length === 0 ? s.noRiders : s.noMatches}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="mt-3 w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-y border-line text-left text-xs uppercase tracking-wider text-muted">
                    <th className="px-5 py-2.5 font-medium">{s.colRider}</th>
                    <th className="px-3 py-2.5 font-medium">{s.colScore}</th>
                    <th className="px-3 py-2.5 font-medium">{s.colTrend}</th>
                    <th className="px-3 py-2.5 font-medium">{s.colCoverage}</th>
                    <th className="px-3 py-2.5 font-medium">{s.colConfidence}</th>
                    <th className="px-5 py-2.5 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shown.map((r) => {
                    const tone = r.score === null ? null : scoreTone(r.score);
                    const coverage = pct(r.coverage);
                    return (
                      <tr key={r.id} className="hover:bg-black/2">
                        <td className="px-5 py-3">
                          <Link href={riderHref(r.id)} className="font-medium hover:underline">
                            {r.name}
                          </Link>
                          <p className="text-xs text-muted">{[r.stage_name, r.bike_reg].filter(Boolean).join(" · ") || "—"}</p>
                        </td>
                        <td className="px-3 py-3">
                          {r.score === null ? (
                            <span className="text-muted">{s.notScored}</span>
                          ) : (
                            <>
                              <span className={`tabular text-base font-bold ${tone!.text}`}>{Math.round(r.score)}</span>
                              {r.delta !== null && (
                                <span className={`ml-1.5 text-xs ${r.delta >= 0 ? "text-safe" : "text-danger"}`}>
                                  {r.delta >= 0 ? "+" : ""}
                                  {Math.round(r.delta)}
                                </span>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {r.trend.length > 1 && tone && <Sparkline values={r.trend.map((w) => Math.round(w.score))} width={72} height={24} stroke={tone.stroke} />}
                        </td>
                        <td className="px-3 py-3">{coverage === null ? <span className="text-muted">—</span> : <CoverageMeter value={coverage} />}</td>
                        <td className="tabular px-3 py-3 text-muted">{r.confidence === null ? "—" : `${pct(r.confidence)}%`}</td>
                        <td className="px-5 py-3 text-right">
                          {r.flags.length > 0 && (
                            <Badge tone={r.flags.includes("low_coverage") || r.flags.includes("score_up_coverage_down") ? "danger" : "warn"}>
                              {format(s.flagCount, { n: r.flags.length })}
                            </Badge>
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

        <div className="space-y-4">
          <Card>
            <CardTitle action={<Badge tone={flags.length ? "danger" : "safe"}>{flags.length}</Badge>}>{s.needsAttention}</CardTitle>
            {flags.length === 0 ? (
              <p className="text-sm text-muted">{s.nothingFlagged}</p>
            ) : (
              <ul className="space-y-3">
                {flags.map((f) => (
                  <li key={f.rider_id}>
                    <Link href={riderHref(f.rider_id)} className="block rounded-xl border border-line p-3 hover:border-ink">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{f.name}</span>
                        <span className={`tabular font-bold ${scoreTone(f.score).text}`}>{Math.round(f.score)}</span>
                      </div>
                      <ul className="mt-1.5 space-y-1">
                        {f.reasons.map((code) => (
                          <li key={code} className="text-xs text-muted">
                            • {flagText(t, code)}
                          </li>
                        ))}
                      </ul>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="space-y-6">
            <InviteRiderForm saccoId={sacco.id} />
            <ShiftUploadForm saccoId={sacco.id} />
          </Card>
        </div>
      </div>
    </>
  );
}

export default async function SaccoPage({ searchParams }: PageProps<"/[lang]/sacco">) {
  const { locale } = await getI18n();
  return (
    <Suspense fallback={<Loading className="h-[560px]" />}>
      <FleetView locale={locale} searchParams={searchParams as Promise<{ org?: string; filter?: string }>} />
    </Suspense>
  );
}
