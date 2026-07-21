import { isProd } from '@/config/env';

/**
 * Minimal structured logger. Keeps the starter dependency-free (no pino) while
 * still emitting one JSON line per event in production and a readable line in
 * dev. `logAuth` / `logSecurity` are the semantic helpers auth code calls so
 * security-relevant events land in one grep-able place.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';
type Fields = Record<string, unknown>;

const SECRET_KEYS = new Set(['password', 'passwordHash', 'token', 'authorization', 'cookie']);

/** Drop obviously-sensitive fields before anything reaches the log sink. */
function redact(fields: Fields): Fields {
  const out: Fields = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = SECRET_KEYS.has(key) ? '[REDACTED]' : value;
  }
  return out;
}

function emit(level: Level, message: string, fields?: Fields): void {
  const data = fields ? redact(fields) : undefined;
  if (isProd) {
    const line = { level, time: new Date().toISOString(), msg: message, ...data };
    process.stdout.write(JSON.stringify(line) + '\n');
    return;
  }
  const suffix = data ? ' ' + JSON.stringify(data) : '';
  console[level === 'debug' ? 'log' : level](`[${level}] ${message}${suffix}`);
}

export const logger = {
  debug: (message: string, fields?: Fields) => emit('debug', message, fields),
  info: (message: string, fields?: Fields) => emit('info', message, fields),
  warn: (message: string, fields?: Fields) => emit('warn', message, fields),
  error: (message: string, fields?: Fields) => emit('error', message, fields),

  /** Auth lifecycle events (login_success, registration_success, ...). */
  logAuth: (event: string, fields?: Fields) => emit('info', `auth: ${event}`, fields),

  /** Security-relevant events (failed login, lockout, ...). Always at warn. */
  logSecurity: (event: string, fields?: Fields) => emit('warn', `security: ${event}`, fields)
};
