import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getI18n } from "@/lib/i18n/server";
import { privacyPolicy } from "@/lib/legal/privacy";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  const doc = privacyPolicy[locale];
  return {
    title: doc.title,
    description: doc.description,
    alternates: { languages: { en: "/en/privacy", sw: "/sw/privacy" } },
  };
}

export default async function PrivacyPage() {
  const { locale } = await getI18n();
  return <LegalPage doc={privacyPolicy[locale]} locale={locale} />;
}
