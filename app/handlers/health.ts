/**
 * Health handler. No dependencies, no auth — a liveness probe that also
 * confirms the API layer is reachable.
 */
export const check = () => ({
  status: 'ok',
  uptime: process.uptime(),
  timestamp: new Date().toISOString()
});
