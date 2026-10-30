import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Set NEXT_PUBLIC_SITE_URL to the production domain once there is one.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const description =
  "Phone-only telematics that turns real boda riding behaviour into a Rider Safety Score, so careful riders get insurance they can actually afford.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Boda Bora — Rider Safety Score",
    template: "%s · Boda Bora",
  },
  description,
  applicationName: "Boda Bora",

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

  openGraph: {
    title: "Boda Bora — Rider Safety Score",
    description,
    url: "/",
    siteName: "Boda Bora",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Boda Bora logo with the tagline: insurance priced on how you actually ride",
      },
    ],
    locale: "en_KE",
    alternateLocale: ["sw_KE"],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Boda Bora — Rider Safety Score",
    description,
    images: ["/images/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1a14",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
