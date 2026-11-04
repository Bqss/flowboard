import { describe, expect, it } from 'bun:test';
import { isAllowedPushEndpoint } from '../app/services/web-push';

describe('isAllowedPushEndpoint', () => {
  it('allows HTTPS endpoints on supported push services', () => {
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com/fcm/send/opaque-token')).toBe(true);
    expect(isAllowedPushEndpoint('https://updates.push.services.mozilla.com/wpush/opaque-token')).toBe(true);
    expect(isAllowedPushEndpoint('https://web.push.apple.com/opaque-token')).toBe(true);
  });

  it('rejects non-HTTPS, credentialed, custom-port, and unrelated endpoints', () => {
    expect(isAllowedPushEndpoint('http://fcm.googleapis.com/fcm/send/token')).toBe(false);
    expect(isAllowedPushEndpoint('https://user:pass@fcm.googleapis.com/push')).toBe(false);
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com:8443/push')).toBe(false);
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com.attacker.example/push')).toBe(false);
    expect(isAllowedPushEndpoint('not a url')).toBe(false);
  });
});
