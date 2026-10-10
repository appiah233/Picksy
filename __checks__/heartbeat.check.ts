import { HeartbeatMonitor } from 'checkly/constructs'

// Placeholder only: Picksy currently has no scheduled job to send heartbeats.
// Keep this monitor inactive until a real scheduled task and ping integration exist.

new HeartbeatMonitor('picksy-heartbeat-placeholder', {
  name: 'Picksy scheduled task heartbeat (inactive placeholder)',
  activated: false,
  period: 1,
  periodUnit: 'hours',
  grace: 30,
  graceUnit: 'minutes',
})
