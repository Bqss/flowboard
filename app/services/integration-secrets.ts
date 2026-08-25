import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual
} from 'node:crypto';
import { env } from '@config/env';

const CIPHER = 'aes-256-gcm';
const IV_LENGTH = 12;

const getSecret = (value: string | undefined, name: string) => {
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
};

const deriveKey = (secret: string) => createHash('sha256').update(secret).digest();

export const createConnectorToken = () => `fbw_${randomBytes(32).toString('base64url')}`;

export const getTokenPrefix = (token: string) => token.slice(0, 12);

export const hashConnectorToken = (token: string) => {
  const pepper = getSecret(env.integrationTokenPepper, 'INTEGRATION_TOKEN_PEPPER');
  return createHash('sha256').update(`${pepper}:${token}`).digest('hex');
};

export const verifyConnectorToken = (token: string, expectedHash: string) => {
  const actual = Buffer.from(hashConnectorToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export const encryptSecret = (value: string) => {
  const key = deriveKey(getSecret(env.secretsEncryptionKey, 'SECRETS_ENCRYPTION_KEY'));
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(CIPHER, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
};

export const decryptSecret = (payload: string) => {
  const [ivEncoded, tagEncoded, encryptedEncoded] = payload.split('.');
  if (!ivEncoded || !tagEncoded || !encryptedEncoded) throw new Error('Invalid encrypted secret.');

  const key = deriveKey(getSecret(env.secretsEncryptionKey, 'SECRETS_ENCRYPTION_KEY'));
  const decipher = createDecipheriv(CIPHER, key, Buffer.from(ivEncoded, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, 'base64url')),
    decipher.final()
  ]).toString('utf8');
};
