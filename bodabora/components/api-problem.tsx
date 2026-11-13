import Link from "next/link";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/server";
import { withLocale, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

// Runs `load`, or explains what went wrong instead of crashing the page. Only API errors and
// network failures are handled here (a lapsed session goes back to sign-in); anything else,
// including Next.js control flow, is rethrown untouched.
export async function loadOr<T>(
  load: () => Promise<T>,
  ctx: { locale: Locale; t: Dictionary; next: string },
): Promise<{ ok: true; data: T } | { ok: false; problem: React.ReactNode }> {
  try {
    return { ok: true, data: await load() };
  } catch (err) {
    if (!(err instanceof ApiError) && !(err instanceof TypeError)) throw err; // TypeError: fetch failed
    if (err instanceof ApiError && err.status === 401) {
      redirect(`${withLocale(ctx.locale, "/sign-in")}?next=${encodeURIComponent(ctx.next)}`);
    }
    return { ok: false, problem: <ApiProblem error={err} locale={ctx.locale} t={ctx.t} retry={ctx.next} /> };
  }
}

export function ApiProblem({ error, locale, t, retry }: { error: unknown; locale: Locale; t: Dictionary; retry: string }) {
  const status = error instanceof ApiError ? error.status : 0;
  const forbidden = status === 403 || status === 404;
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <p className="font-semibold">{forbidden ? t.app.noAccessTitle : t.app.errorTitle}</p>
      <p className="mt-1 text-sm text-muted">{forbidden ? t.app.noAccessBody : t.app.errorBody}</p>
      <div className="mt-4 flex gap-4 text-sm font-semibold">
        <Link href={retry} className="hover:underline">
          {t.app.retry}
        </Link>
        <Link href={withLocale(locale, "/start")} className="hover:underline">
          {t.app.myHome}
        </Link>
      </div>
    </div>
  );
}

// Shared loading placeholder for data sections.
export function Loading({ className = "h-64" }: { className?: string }) {
  return <div aria-busy="true" className={`animate-pulse rounded-2xl bg-black/5 ${className}`} />;
}
