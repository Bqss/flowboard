const required = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/app'),
  sessionCookie: process.env.SESSION_COOKIE ?? 'sid',
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? 7),
  loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS ?? 5),
  loginLockoutMs: Number(process.env.LOGIN_LOCKOUT_MS ?? 15 * 60 * 1000)
} as const;

export const isProd = env.nodeEnv === 'production';
