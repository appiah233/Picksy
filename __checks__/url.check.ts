import { ApiCheck, AssertionBuilder } from 'checkly/constructs'

const baseUrl = process.env.PICKSY_BASE_URL!.replace(/\/$/, '')
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
const headers = bypassSecret
  ? [
      { key: 'x-vercel-protection-bypass', value: bypassSecret },
      { key: 'x-vercel-set-bypass-cookie', value: 'true' },
    ]
  : []

new ApiCheck('picksy-studio-route', {
  name: 'Picksy Studio route responds',
  activated: true,
  maxResponseTime: 10000,
  degradedResponseTime: 5000,
  request: {
    url: `${baseUrl}/studio`,
    method: 'GET',
    headers,
    followRedirects: true,
    assertions: [AssertionBuilder.statusCode().equals(200)],
  }
})
