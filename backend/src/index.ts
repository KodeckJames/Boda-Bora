import app from './app'
import { env } from './env'

// Bun entry point. Neon Functions run Node 24, so deployment will get its own entry later.
export default {
  port: env.PORT,
  fetch: app.fetch,
}
