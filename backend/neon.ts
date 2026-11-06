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
        ADMIN_EMAILS: process.env.ADMIN_EMAILS!,
        // Realtime credentials aren't injected into Functions and NEON_* is reserved, so rename.
        REALTIME_SECRET: process.env.NEON_REALTIME_SECRET!,
      },
    },
    // Scheduled work: nightly scoring (cron triggers below).
    jobs: {
      name: "Boda Bora jobs",
      source: "./src/functions/jobs.ts",
      env: { NODE_ENV: "production" },
    },
    // Processes uploaded trace batches (storage trigger below).
    ingest: {
      name: "Boda Bora ingest",
      source: "./src/functions/ingest.ts",
      env: { NODE_ENV: "production" },
    },
  },
  buckets: {
    // Raw sensor trace batches uploaded by the rider app.
    traces: { access: "private" },
  },
  triggers: {
    // Each uploaded ride-mode batch is processed into trips and risk events.
    "trace-uploaded": {
      type: "storage_object_created",
      function: "ingest",
      bucket: "traces",
      prefix: "batches/",
    },
    // 00:30 EAT (UTC+3) every night: weekly scores, coverage and confidence.
    "nightly-scores": {
      type: "schedule",
      function: "jobs",
      cron: "30 21 * * *",
      functionPath: "/nightly-scores",
    },
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
