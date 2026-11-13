import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading, loadOr } from "@/components/api-problem";
import { Button, PageHeader } from "@/components/ui";
import { WeekView } from "@/components/week-view";
import { api, getMe, needsRiderProfile } from "@/lib/api/server";
import type { CoachingMessage, RiderScore, RiderWeek } from "@/lib/api/types";
import { weekRange } from "@/lib/format";
import { format, withLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary, getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).week.metaTitle };
}

async function MyWeek({ locale }: { locale: Locale }) {
  const { t } = await getI18n();
  const here = withLocale(locale, "/rider/week");
  const meResult = await loadOr(getMe, { locale, t, next: here });
  if (!meResult.ok) return meResult.problem;
  const me = meResult.data;
  if (!me.rider) redirect(withLocale(locale, me.profile.role && me.profile.role !== "rider" ? "/start" : "/onboarding"));
  if (needsRiderProfile(me)) redirect(withLocale(locale, "/onboarding"));
  const id = me.rider.id;

  const result = await loadOr(
    async () => {
      // The latest scored week, or this week if nothing is scored yet.
      const score = await api<RiderScore>(`/api/riders/${id}/score`);
      const query = score.current ? `?week=${score.current.week_start}` : "";
      const [week, coaching] = await Promise.all([
        api<RiderWeek>(`/api/riders/${id}/week${query}`),
        api<{ latest: CoachingMessage | null }>(`/api/coaching/me?lang=${locale}`),
      ]);
      return { week, coaching: coaching.latest };
    },
    { locale, t, next: here },
  );
  if (!result.ok) return result.problem;
  const { week, coaching } = result.data;
  const w = t.week;

  return (
    <>
      <PageHeader
        eyebrow={format(w.eyebrow, { range: weekRange(week.week_start, locale) })}
        title={format(w.title, { name: me.rider.name.split(" ")[0]! })}
        description={w.description}
        actions={<Button href={withLocale(locale, "/rider")} variant="secondary">{t.common.backToRiderApp}</Button>}
      />
      <WeekView week={week} coaching={coaching} locale={locale} t={t} riderId={id} />
    </>
  );
}

export default async function WeekTracePage() {
  const { locale } = await getI18n();
  return (
    <Suspense fallback={<Loading className="h-[640px]" />}>
      <MyWeek locale={locale} />
    </Suspense>
  );
}
