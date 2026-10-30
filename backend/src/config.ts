// Central place for environment config. Bun loads .env automatically.
export const config = {
  port: Number(process.env.PORT ?? 4000),
  env: process.env.NODE_ENV ?? "development",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  ussdServiceCode: process.env.USSD_SERVICE_CODE ?? "*384*22#",
};

export const isProd = config.env === "production";
