"use client";

import { createAuthClient } from "@neon/auth/next";

// Browser auth client. Talks to the same-origin /api/auth proxy, so it takes no arguments.
export const authClient = createAuthClient();
