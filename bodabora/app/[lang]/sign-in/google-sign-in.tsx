"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { withLocale, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";

// Only same-site paths, so ?next= can't send someone to another origin after sign-in.
// Without one, /start sends each user to their own home (onboarding, rider app, SACCO or insurer).
function safeNext(next: string | null, locale: Locale) {
  const fallback = withLocale(locale, "/start");
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

export function GoogleSignIn() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"), locale);
  const { data: session } = authClient.useSession();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(params.has("error"));

  // Already signed in (e.g. opened /sign-in from a bookmark): go straight on.
  useEffect(() => {
    if (session?.user) router.replace(next);
  }, [session, next, router]);

  async function signIn() {
    setPending(true);
    setFailed(false);
    const origin = window.location.origin;
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: `${origin}${next}`,
      errorCallbackURL: `${origin}${withLocale(locale, "/sign-in")}?error=oauth&next=${encodeURIComponent(next)}`,
    });
    // On success the browser is already on its way to Google.
    if (error) {
      setPending(false);
      setFailed(true);
    }
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-white font-semibold text-foreground transition-colors hover:bg-black/[0.03] disabled:opacity-60"
      >
        <GoogleIcon />
        {pending ? t.auth.redirecting : t.auth.google}
      </button>
      {failed && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {t.auth.error}
        </p>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
