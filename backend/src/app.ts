import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { env } from './env'
import { notFound, onError } from './lib/errors'
import { coaching } from './routes/coaching'
import { health } from './routes/health'
import { insurer } from './routes/insurer'
import { riders } from './routes/riders'
import { sacco } from './routes/sacco'
import { trips } from './routes/trips'
import { ussd } from './routes/ussd'

const app = new Hono()

app.use(logger())
app.use(secureHeaders())
app.use('/api/*', cors({ origin: env.CORS_ORIGINS }))

app.get('/', (c) => c.json({ name: 'Boda Bora API', docs: '/api/health' }))

// Chained so the route types flow to the frontend's typed client (hc<AppType>).
const routes = app
  .route('/api/health', health)
  .route('/api/riders', riders)
  .route('/api/trips', trips)
  .route('/api/coaching', coaching)
  .route('/api/sacco', sacco)
  .route('/api/insurer', insurer)
  .route('/ussd', ussd)

app.notFound(notFound)
app.onError(onError)

export type AppType = typeof routes
export default app
