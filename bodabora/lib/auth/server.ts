import { createNeonAuth } from "@neon/auth/next/server";

// Neon Auth (Managed Better Auth) for server code: the /api/auth proxy, proxy.ts route
// protection and session reads. Google is the only sign-in method (set on the Neon branch).
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});
