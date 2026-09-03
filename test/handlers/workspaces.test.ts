import { mock, test, expect, beforeEach } from 'bun:test';

// ── Mocks ───────────────────────────────────────────────────────────────
// We mock the three modules the handler touches outside its own logic so the
// test never hits a real DB, Resend API, or process.env.

const sendEmailMock = mock((_msg: unknown): Promise<{ ok: boolean; id?: string }> =>
  Promise.resolve({ ok: true, id: 'test-id' })
);

const createWorkspaceInviteMock = mock(async ({
  workspaceId,
  email,
  role,
  invitedById
}: {
  workspaceId: string;
  email: string;
  role: string;
  invitedById: string;
}) => ({
  id: 'invite-123',
  workspaceId,
  email: email.toLowerCase(),
  role,
  token: 'tok-abc-123',
  invitedById,
  expiresAt: new Date('2026-09-10T00:00:00Z'),
  createdAt: new Date('2026-09-03T00:00:00Z'),
  acceptedAt: null
}));

mock.module('@services/email', () => ({ sendEmail: sendEmailMock }));
mock.module('@services/workspace', () => ({
  createWorkspaceInvite: createWorkspaceInviteMock,
  // Stubs not exercised by createInvite but required by the module barrel:
  acceptWorkspaceInvite: () => Promise.resolve({ workspaceId: '', alreadyMember: false }),
  countWorkspaceOwners: () => Promise.resolve(0),
  getActiveWorkspaceContext: () => Promise.resolve(null),
  getInviteByToken: () => Promise.resolve(null),
  getInviteById: () => Promise.resolve(null),
  deleteInvite: () => Promise.resolve(false),
  extendInviteExpiry: () => Promise.resolve({}),
  getMembership: () => Promise.resolve(null),
  listPendingInvites: () => Promise.resolve([]),
  listPendingInvitesForEmail: () => Promise.resolve([]),
  listWorkspaceMembers: () => Promise.resolve([]),
  listWorkspacesForUser: () => Promise.resolve([]),
  removeWorkspaceMember: () => Promise.resolve(),
  setActiveWorkspace: () => Promise.resolve(),
  updateWorkspace: () => Promise.resolve({})
}));
mock.module('@config/env', () => ({
  env: {
    appUrl: 'https://test.flowboard.app',
    emailFrom: 'test <no-reply@test.app>',
    emailResendApiKey: 'test-key'
  }
}));

// Dynamic import is required here: mock.module() must register before the
// handler module loads so its static imports resolve to our mocks.
const { createInvite } = await import('@handlers/workspaces');

// ── Helpers ─────────────────────────────────────────────────────────────

const ownerUser = {
  id: 'user-owner',
  email: 'owner@test.app',
  name: 'Owner Name',
  phone: null,
  avatarUrl: null,
  activeWorkspaceId: 'ws-1',
  platformAdmin: false,
  passwordHash: null,
  provider: null,
  providerId: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

const memberUser = { ...ownerUser, id: 'user-member', name: 'Member Name' };

const workspace = {
  id: 'ws-1',
  name: 'Test Workspace',
  slug: 'test-workspace',
  createdAt: new Date(),
  updatedAt: new Date()
};

const baseCtx = {
  params: { workspaceId: 'ws-1' },
  query: {},
  set: { status: undefined as number | undefined, headers: {} },
  cookie: {}
};

// ── Tests ───────────────────────────────────────────────────────────────

beforeEach(() => {
  sendEmailMock.mockClear();
  createWorkspaceInviteMock.mockClear();
});

test('createInvite sends an email with the invite link and returns the invite', async () => {
  const res = await createInvite({
    ...baseCtx,
    user: ownerUser,
    workspace,
    membership: { role: 'owner' },
    body: { email: 'New@Example.com' }
  } as never);

  // 1. DB invite created with lowercased email
  expect(createWorkspaceInviteMock).toHaveBeenCalledTimes(1);
  expect(createWorkspaceInviteMock.mock.calls[0][0]).toMatchObject({
    workspaceId: 'ws-1',
    email: 'New@Example.com',
    role: 'member',
    invitedById: 'user-owner'
  });

  // 2. Email sent
  expect(sendEmailMock).toHaveBeenCalledTimes(1);
  const emailArg = sendEmailMock.mock.calls[0][0] as {
    to: string;
    subject: string;
    html: string;
    text: string;
  };
  expect(emailArg.to).toBe('new@example.com');
  expect(emailArg.subject).toContain('Test Workspace');
  expect(emailArg.subject).toContain('Owner Name');
  expect(emailArg.html).toContain('https://test.flowboard.app/invite/tok-abc-123');
  expect(emailArg.text).toContain('https://test.flowboard.app/invite/tok-abc-123');

  // 3. Response shape
  expect(res).toEqual({
    invite: {
      id: 'invite-123',
      email: 'new@example.com',
      role: 'member',
      token: 'tok-abc-123',
      expiresAt: new Date('2026-09-10T00:00:00Z')
    }
  });
});

test('createInvite returns 403 when user is missing', async () => {
  const res = await createInvite({
    ...baseCtx,
    user: null,
    workspace,
    membership: { role: 'owner' },
    body: { email: 'a@b.com' }
  } as never);

  expect(baseCtx.set.status).toBe(403);
  expect(res).toEqual({ error: 'Forbidden' });
  expect(sendEmailMock).not.toHaveBeenCalled();
  expect(createWorkspaceInviteMock).not.toHaveBeenCalled();
});

test('createInvite returns 403 when workspace is missing', async () => {
  const res = await createInvite({
    ...baseCtx,
    user: ownerUser,
    workspace: null,
    membership: { role: 'owner' },
    body: { email: 'a@b.com' }
  } as never);

  expect(baseCtx.set.status).toBe(403);
  expect(res).toEqual({ error: 'Forbidden' });
  expect(sendEmailMock).not.toHaveBeenCalled();
});

test('createInvite returns 403 for non-owner membership', async () => {
  const res = await createInvite({
    ...baseCtx,
    user: memberUser,
    workspace,
    membership: { role: 'member' },
    body: { email: 'a@b.com' }
  } as never);

  expect(baseCtx.set.status).toBe(403);
  expect(res).toEqual({ error: 'Owner access required' });
  expect(sendEmailMock).not.toHaveBeenCalled();
  expect(createWorkspaceInviteMock).not.toHaveBeenCalled();
});

test('createInvite defaults role to "member" when omitted', async () => {
  await createInvite({
    ...baseCtx,
    user: ownerUser,
    workspace,
    membership: { role: 'owner' },
    body: { email: 'a@b.com' }
  } as never);

  expect(createWorkspaceInviteMock.mock.calls[0][0]).toMatchObject({ role: 'member' });
});

test('createInvite returns 400 when role is not "member"', async () => {
  const res = await createInvite({
    ...baseCtx,
    user: ownerUser,
    workspace,
    membership: { role: 'owner' },
    body: { email: 'a@b.com', role: 'owner' as 'member' }
  } as never);

  expect(baseCtx.set.status).toBe(400);
  expect(res).toEqual({ error: 'Only member invites are supported in v1' });
  expect(sendEmailMock).not.toHaveBeenCalled();
  expect(createWorkspaceInviteMock).not.toHaveBeenCalled();
});

test('createInvite still returns the invite when sendEmail rejects (fire-and-forget)', async () => {
  sendEmailMock.mockImplementationOnce(() =>
    Promise.reject(new Error('Resend API down'))
  );

  // Suppress the expected console.error from the .catch handler
  const spy = mock((_args: unknown[]) => {});
  const origError = console.error;
  console.error = spy as unknown as typeof console.error;

  const res = await createInvite({
    ...baseCtx,
    user: ownerUser,
    workspace,
    membership: { role: 'owner' },
    body: { email: 'a@b.com' }
  } as never);

  console.error = origError;

  expect(sendEmailMock).toHaveBeenCalledTimes(1);
  expect(res).not.toHaveProperty('error');
  expect(res).toMatchObject({
    invite: { token: 'tok-abc-123' }
  });
});
