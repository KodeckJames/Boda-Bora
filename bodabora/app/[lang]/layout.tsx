import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RegisterServiceWorker } from "@/components/pwa/service-worker";
import { I18nProvider } from "@/lib/i18n/client";
import { locales } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// NEXT_PUBLIC_SITE_URL overrides this, e.g. once a custom domain is added.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://boda-bora.vercel.app";

// Both languages are prerendered: /en/... and /sw/...
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: t.meta.title,
      template: "%s · Boda Bora",
    },
    description: t.meta.description,
    applicationName: "Boda Bora",
    // iOS home-screen behaviour (the manifest covers Android).
    appleWebApp: {
      capable: true,
      title: "Boda Bora",
      statusBarStyle: "black-translucent",
    },

    keywords: [
      "Boda Bora",
      "boda boda",
      "motorcycle insurance",
      "telematics",
      "rider safety score",
      "SACCO",
      "Kenya",
      "road safety",
    ],

    authors: [{ name: "Kodeck James" }],
    creator: "Kodeck James",

    alternates: {
      languages: { en: "/en", sw: "/sw" },
    },

    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
      url: `/${locale}`,
      siteName: "Boda Bora",
      images: [
        {
          url: "/images/og-image.png",
          width: 1200,
          height: 630,
          alt: t.meta.ogAlt,
        },
      ],
      locale: locale === "sw" ? "sw_KE" : "en_KE",
      alternateLocale: [locale === "sw" ? "en_KE" : "sw_KE"],
      type: "website",
    },

    twitter: {
      card: "summary_large_image",
      title: t.meta.title,
      description: t.meta.description,
      images: ["/images/og-image.png"],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0f1a14",
};

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const { locale, t } = await getI18n();
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <I18nProvider locale={locale} t={t}>
          {children}
        </I18nProvider>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
