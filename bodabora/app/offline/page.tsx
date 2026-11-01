import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui";

export const metadata: Metadata = { title: "Offline" };

// Served by the service worker when a page isn't cached and there's no network.
export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-ink px-6 text-center text-white">
      <Logo dark />
      <h1 className="text-2xl font-bold">Hakuna mtandao</h1>
      <p className="max-w-xs text-white/70">
        You&apos;re offline. Shifts you record are saved on this phone and upload when you&apos;re
        back online.
      </p>
      <Link href="/rider/ride" className="rounded-full bg-hivis px-5 py-2.5 text-sm font-semibold text-ink">
        Anza kazi · Start shift
      </Link>
    </main>
  );
}
