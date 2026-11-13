import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getI18n } from "@/lib/i18n/server";
import { termsOfService } from "@/lib/legal/terms";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getI18n();
  const doc = termsOfService[locale];
  return {
    title: doc.title,
    description: doc.description,
    alternates: { languages: { en: "/en/terms", sw: "/sw/terms" } },
  };
}

export default async function TermsPage() {
  const { locale } = await getI18n();
  return <LegalPage doc={termsOfService[locale]} locale={locale} />;
}
