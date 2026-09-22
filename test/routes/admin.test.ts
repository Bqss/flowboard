import { test, expect } from 'bun:test';
import { buildApi } from '../../routes/api';

test('routes: /api/admin/overview is mounted and not 404', async () => {
  const api = buildApi();
  const res = await api.handle(new Request('http://localhost/api/admin/overview'));
  expect(res.status).toBe(403);
});

test('routes: /api/admin/users/:userId/impersonate is mounted and requires admin', async () => {
  const api = buildApi();
  const res = await api.handle(
    new Request('http://localhost/api/admin/users/00000000-0000-0000-0000-000000000000/impersonate', {
      method: 'POST'
    })
  );
  expect(res.status).toBe(403);
});

test('routes: /api/admin/impersonate is mounted and requires admin', async () => {
  const api = buildApi();
  const res = await api.handle(
    new Request('http://localhost/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '00000000-0000-0000-0000-000000000000' })
    })
  );
  expect(res.status).toBe(403);
});

test('routes: /api/auth/stop-impersonating is mounted and rejects when not impersonating', async () => {
  const api = buildApi();
  const res = await api.handle(
    new Request('http://localhost/api/auth/stop-impersonating', { method: 'POST' })
  );
  // Without impersonator cookie, handler rejects with 400 Bad Request
  expect(res.status).toBe(400);
  const data = await res.json();
  expect(data.error).toBe('Not currently impersonating');
});
