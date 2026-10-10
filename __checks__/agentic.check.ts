import { AgenticCheck } from 'checkly/constructs'

new AgenticCheck('picksy-homepage-content', {
  name: 'Picksy homepage content is visible',
  prompt:
    `Open ${process.env.PICKSY_BASE_URL}. Confirm the page loads successfully, the Picksy wordmark is visible, and the main content area is present.`,
  // Agentic checks cannot currently attach the Vercel protection bypass header.
  // Keep inactive until PICKSY_BASE_URL is publicly reachable without that header.
  activated: false,
  frequency: 10,
  locations: ['us-east-1', 'eu-central-1'],
})
