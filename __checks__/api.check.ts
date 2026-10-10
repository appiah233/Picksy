import { ApiCheck, AssertionBuilder } from 'checkly/constructs'

const baseUrl = process.env.PICKSY_BASE_URL!.replace(/\/$/, '')
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
const headers = bypassSecret
  ? [
      { key: 'x-vercel-protection-bypass', value: bypassSecret },
      { key: 'x-vercel-set-bypass-cookie', value: 'true' },
    ]
  : []

// API checks send an HTTP request to a URL endpoint and validate the response. Read more at:
// https://www.checklyhq.com/docs/api-checks/

new ApiCheck('admin-api-requires-authentication', {
  name: 'Picksy admin API rejects anonymous requests',
  alertChannels: [],
  degradedResponseTime: 10000, // milliseconds
  maxResponseTime: 20000,
  request: {
    url: `${baseUrl}/api/admin/imports`,
    method: 'GET',
    headers,
    followRedirects: true,
    skipSSL: false,
    assertions: [
      AssertionBuilder.statusCode().equals(401),
      AssertionBuilder.jsonBody('$.error.code').equals('UNAUTHORIZED'),
    ],
  },
  runParallel: false,
})
