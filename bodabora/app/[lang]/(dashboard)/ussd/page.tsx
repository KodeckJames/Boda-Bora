import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { getDictionary, getI18n } from "@/lib/i18n/server";
import { UssdPhone } from "./ussd-phone";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).ussd.metaTitle };
}

export default async function UssdPage() {
  const { locale, t } = await getI18n();
  const u = t.ussd;
  const menuMap =
    locale === "sw"
      ? `*384*22#
├─ 1 Alama yangu ── 1 Maelezo zaidi
├─ 2 Ushauri wa wiki
├─ 3 Safari za wiki
├─ 4 Shiriki na bima ── 1 Ndiyo / 2 Hapana
└─ 0 English`
      : `*384*22#
├─ 1 My score ── 1 More detail
├─ 2 Weekly advice
├─ 3 This week's trips
├─ 4 Share with insurer ── 1 Yes / 2 No
└─ 0 Kiswahili`;
  return (
    <>
      <PageHeader eyebrow={u.eyebrow} title={u.title} description={u.description} />
      <div className="grid items-start gap-10 lg:grid-cols-[320px_1fr]">
        <UssdPhone />
        <div className="grid gap-4 sm:grid-cols-2">
          {u.notes.map((n) => (
            <Card key={n.title}>
              <h3 className="font-semibold">{n.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{n.body}</p>
            </Card>
          ))}
          <Card className="sm:col-span-2">
            <h3 className="font-semibold">{u.menuMap}</h3>
            <pre className="mt-3 overflow-x-auto font-mono text-xs leading-relaxed text-muted">{menuMap}</pre>
          </Card>
        </div>
      </div>
    </>
  );
}
