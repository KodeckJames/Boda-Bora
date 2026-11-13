import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";
import { defaultLocale, hasLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";

// Picks the language for URLs without one: the user's saved choice, else the browser's
// Accept-Language (e.g. "sw-KE,sw;q=0.9,en;q=0.8" → sw), else English.
function preferredLocale(request: NextRequest): Locale {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (saved && hasLocale(saved)) return saved;
  const ranked = (request.headers.get("accept-language") ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag!.toLowerCase().split("-")[0]!, q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return ranked.find((r) => hasLocale(r.lang))?.lang as Locale | undefined ?? defaultLocale;
}

// Pages that need a signed-in user (path after the locale). The live-scoring demo stays public.
const PROTECTED = ["/start", "/onboarding", "/rider", "/sacco", "/insurer"];
const PUBLIC_EXCEPTIONS = ["/rider/live"];
const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
const isProtectedPath = (path: string) =>
  PROTECTED.some((p) => under(path, p)) && !PUBLIC_EXCEPTIONS.some((p) => under(path, p));

// Google sign-in comes back with ?neon_auth_session_verifier=…, which the auth middleware
// swaps for the session cookie.
const OAUTH_VERIFIER = "neon_auth_session_verifier";

export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (!hasLocale(first)) {
    request.nextUrl.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  const rest = pathname.slice(first.length + 1) || "/";
  const protectedPage = isProtectedPath(rest);
  if (!protectedPage && !searchParams.has(OAUTH_VERIFIER)) return;

  // Signed out on a protected page → /{lang}/sign-in?next=<where they were going>.
  const loginUrl = `/${first}/sign-in?next=${encodeURIComponent(pathname + search)}`;
  return auth.middleware({ loginUrl, publicRoutes: protectedPage ? [] : [pathname] })(request);
}

export const config = {
  // Everything except Next internals, API routes and files (icons, sw.js, manifest, images).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
