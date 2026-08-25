const required = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/app'),
  sessionCookie: process.env.SESSION_COOKIE ?? 'sid',
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS ?? 7),
  loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS ?? 5),
  loginLockoutMs: Number(process.env.LOGIN_LOCKOUT_MS ?? 15 * 60 * 1000),
  flowboardApiKey: isProduction
    ? required('FLOWBOARD_API_KEY')
    : (process.env.FLOWBOARD_API_KEY ?? 'dev-flowboard-key'),
  integrationTokenPepper: isProduction
    ? required('INTEGRATION_TOKEN_PEPPER')
    : (process.env.INTEGRATION_TOKEN_PEPPER ?? 'dev-integration-token-pepper'),
  secretsEncryptionKey: isProduction
    ? required('SECRETS_ENCRYPTION_KEY')
    : (process.env.SECRETS_ENCRYPTION_KEY ?? 'dev-secrets-encryption-key'),
  integrationRateLimitPerMinute: Number(process.env.INTEGRATION_RATE_LIMIT_PER_MINUTE ?? 60),
  wajomRequestTimeoutMs: Number(process.env.WAJOM_REQUEST_TIMEOUT_MS ?? 10_000),
  whatsappMaxAttempts: Number(process.env.WA_MAX_ATTEMPTS ?? 3),
  whatsappRetryDelayMinutes: Number(process.env.WA_RETRY_DELAY_MINUTES ?? 5),
  waWebhookSecret: isProduction
    ? required('WA_WEBHOOK_SECRET')
    : (process.env.WA_WEBHOOK_SECRET ?? 'dev-webhook-secret'),
  whatsappMock: process.env.WA_MOCK === '1' || (!isProduction && process.env.WA_MOCK !== '0'),
  openAiApiKey: process.env.OPENAI_API_KEY ?? '',
  openAiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
} as const;

export const isProd = isProduction;
