import { defineConfig } from "@neon/config/v1";

// Neon services for the Boda Bora backend. Apply with `neon deploy --env .env`.
export default defineConfig({
  preview: {
    realtime: true,
  },
  auth: true,
  // aiGateway: true, // re-enable after upgrading to the Launch plan (Free plan blocks deploy)
  functions: {
    // Slug is permanent: it's part of the invocation URL.
    api: {
      name: "Boda Bora API",
      source: "./src/app.ts",
      env: {
        NODE_ENV: "production",
        CORS_ORIGINS: process.env.CORS_ORIGINS!,
        // Realtime credentials aren't injected into Functions and NEON_* is reserved, so rename.
        REALTIME_SECRET: process.env.NEON_REALTIME_SECRET!,
      },
    },
  },
  buckets: {
    // Raw sensor trace batches uploaded by the rider app.
    traces: { access: "private" },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
