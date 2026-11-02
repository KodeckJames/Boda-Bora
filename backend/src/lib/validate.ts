import { zValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import type { ZodType } from 'zod'

// zValidator with errors in the API's usual shape: { error, issues: [{ path, message }] }.
export const validate = <T extends ZodType, Target extends keyof ValidationTargets>(target: Target, schema: T) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      return c.json({ error: issues[0]?.message ?? 'Invalid request', issues }, 400)
    }
  })
