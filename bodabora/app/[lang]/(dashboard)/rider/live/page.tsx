import type { Metadata } from "next";
import { Button, PageHeader } from "@/components/ui";
import { withLocale } from "@/lib/i18n/config";
import { getDictionary, getI18n } from "@/lib/i18n/server";
import { LiveDemo } from "./live-demo";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).live.metaTitle };
}

export default async function LivePage() {
  const { locale, t } = await getI18n();
  return (
    <>
      <PageHeader
        eyebrow={t.live.eyebrow}
        title={t.live.title}
        description={t.live.description}
        actions={<Button href={withLocale(locale, "/rider")} variant="secondary">{t.common.backToRiderApp}</Button>}
      />
      <LiveDemo />
    </>
  );
}
