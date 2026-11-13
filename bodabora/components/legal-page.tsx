import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/ui";
import { withLocale, type Locale } from "@/lib/i18n/config";
import { privacyPolicy } from "@/lib/legal/privacy";
import { termsOfService } from "@/lib/legal/terms";
import { CONTACT_URL, type LegalDoc } from "@/lib/legal/types";

// Shared layout for the Privacy Policy and Terms of Service.
export function LegalPage({ doc, locale }: { doc: LegalDoc; locale: Locale }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo href={withLocale(locale, "/")} />
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted">
          {doc.updatedLabel}: {doc.updated}
        </p>
        <div className="mt-8 space-y-4 leading-relaxed">
          {doc.intro.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        {doc.sections.map((s) => (
          <section key={s.title} className="mt-10">
            <h2 className="text-xl font-semibold tracking-tight">{s.title}</h2>
            <div className="mt-3 space-y-3 leading-relaxed text-foreground/90">
              {s.body.map((item, i) =>
                Array.isArray(item) ? (
                  <ul key={i} className="list-disc space-y-2 pl-5">
                    {item.map((li) => (
                      <li key={li}>{li}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={i}>{item}</p>
                ),
              )}
            </div>
          </section>
        ))}
        <p className="mt-10 text-sm">
          <a href={CONTACT_URL} className="font-semibold underline underline-offset-4" target="_blank" rel="noopener noreferrer">
            github.com/KodeckJames/Boda-Bora/issues
          </a>
        </p>
      </main>
      <LegalFooter locale={locale} />
    </div>
  );
}

// Links to both documents, for any page footer.
export function LegalFooter({ locale }: { locale: Locale }) {
  return (
    <footer className="border-t border-line">
      <nav className="mx-auto flex max-w-3xl gap-6 px-4 py-6 text-sm text-muted sm:px-6">
        <Link href={withLocale(locale, "/privacy")} className="hover:text-foreground">
          {privacyPolicy[locale].title}
        </Link>
        <Link href={withLocale(locale, "/terms")} className="hover:text-foreground">
          {termsOfService[locale].title}
        </Link>
      </nav>
    </footer>
  );
}
