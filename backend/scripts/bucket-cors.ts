import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3'

// Lets the rider PWA PUT trace batches straight to the `traces` bucket with a presigned URL.
// Run with: bun scripts/bucket-cors.ts  (reads AWS_* and CORS_ORIGINS from .env)
const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(',').map((o) => o.trim())
const s3 = new S3Client({ forcePathStyle: true })

await s3.send(
  new PutBucketCorsCommand({
    Bucket: 'traces',
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: origins,
          AllowedMethods: ['PUT'],
          AllowedHeaders: ['content-type'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
)
const { CORSRules } = await s3.send(new GetBucketCorsCommand({ Bucket: 'traces' }))
console.log(JSON.stringify(CORSRules, null, 2))
