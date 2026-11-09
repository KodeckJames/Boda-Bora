import type { Metadata } from "next";
import { Button, PageHeader } from "@/components/ui";
import { withLocale } from "@/lib/i18n/config";
import { getDictionary, getI18n } from "@/lib/i18n/server";
import { RideMode } from "./ride-mode";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).ride.metaTitle };
}

export default async function RidePage() {
  const { locale, t } = await getI18n();
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        eyebrow={t.ride.eyebrow}
        title={t.ride.title}
        description={t.ride.description}
        actions={<Button href={withLocale(locale, "/rider")} variant="secondary">{t.common.backToRiderApp}</Button>}
      />
      <RideMode />
    </div>
  );
}
