import { Files } from 'files-sdk'
import { neon } from 'files-sdk/neon'

// Neon Object Storage. The adapter reads the injected AWS_* variables for endpoint and credentials.
export const traces = new Files({ adapter: neon({ bucket: 'traces' }) })
