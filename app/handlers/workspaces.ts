import { type Ctx, toPublicWorkspace } from '@core';
import { env } from '@config/env';
import { sendEmail } from '@services/email';
import {
  acceptWorkspaceInvite,
  countWorkspaceOwners,
  createWorkspaceInvite,
  deleteInvite,
  extendInviteExpiry,
  getActiveWorkspaceContext,
  getInviteById,
  getInviteByToken,
  getMembership,
  listPendingInvites,
  listPendingInvitesForEmail,
  listWorkspaceMembers,
  listWorkspacesForUser,
  removeWorkspaceMember,
  setActiveWorkspace,
  updateWorkspace
} from '@services/workspace';

type WorkspaceIdParams = { workspaceId: string };
type MemberParams = WorkspaceIdParams & { userId: string };
type InviteParams = WorkspaceIdParams & { inviteId: string };
type InviteBody = { email: string; role?: 'member' };
type AcceptInviteBody = { token: string };
type UpdateWorkspaceBody = { name: string };
type TokenParams = { token: string };

export async function list({ user, set }: Ctx) {
  if (!user) {
    set.status = 401;
    return { error: 'Unauthorized' };
  }

  const rows = await listWorkspacesForUser(user.id);
  return {
    workspaces: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      role: row.role,
      joinedAt: row.joinedAt
    }))
  };
}

export async function myInvites({ user, set }: Ctx) {
  if (!user) {
    set.status = 401;
    return { error: 'Unauthorized' };
  }

  const invites = await listPendingInvitesForEmail(user.email);
  return { invites };
}

export function show({ workspace, membership, set }: Ctx<unknown, WorkspaceIdParams>) {
  if (!workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  return { workspace: toPublicWorkspace(workspace, membership.role) };
}

export async function update({
  workspace,
  membership,
  body,
  set
}: Ctx<UpdateWorkspaceBody, WorkspaceIdParams>) {
  if (!workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  if (membership.role !== 'owner') {
    set.status = 403;
    return { error: 'Owner access required' };
  }

  const updated = await updateWorkspace(workspace.id, body.name.trim());
  return { workspace: toPublicWorkspace(updated, membership.role) };
}

export async function members({ workspace, membership, set }: Ctx<unknown, WorkspaceIdParams>) {
  if (!workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  const rows = await listWorkspaceMembers(workspace.id);
  return { members: rows };
}

export async function invites({ workspace, membership, set }: Ctx<unknown, WorkspaceIdParams>) {
  if (!workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  if (membership.role !== 'owner') {
    set.status = 403;
    return { error: 'Owner access required' };
  }

  const pending = await listPendingInvites(workspace.id);
  return { invites: pending };
}

export async function createInvite({
  user,
  workspace,
  membership,
  body,
  set
}: Ctx<InviteBody, WorkspaceIdParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  if (membership.role !== 'owner') {
    set.status = 403;
    return { error: 'Owner access required' };
  }

  const role = body.role ?? 'member';
  if (role !== 'member') {
    set.status = 400;
    return { error: 'Only member invites are supported in v1' };
  }

  const invite = await createWorkspaceInvite({
    workspaceId: workspace.id,
    email: body.email,
    role,
    invitedById: user.id
  });

  // Send invitation email — fire-and-forget; failure is logged but does not
  // block the API response (the invite link is still returned to the caller).
  const inviteLink = `${env.appUrl}/invite/${invite.token}`;
  sendEmail({
    to: invite.email,
    subject: `${user.name} mengundang Anda ke "${workspace.name}"`,
    html: [
      `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">`,
      `<h2 style="margin:0 0 8px">Anda diundang ke "${workspace.name}"</h2>`,
      `<p style="margin:0 0 16px;color:#555">${user.name} mengundang Anda sebagai <strong>${role}</strong> di workspace Flowboard.</p>`,
      `<p style="margin:0 0 24px">Klik tombol di bawah untuk menerima undangan:</p>`,
      `<a href="${inviteLink}" style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Terima Undangan</a>`,
      `<p style="margin:24px 0 0;color:#999;font-size:13px">Atau salin link ini: ${inviteLink}</p>`,
      `<p style="margin:16px 0 0;color:#999;font-size:13px">Undangan berlaku 7 hari.</p>`,
      `</div>`
    ].join(''),
    text: `${user.name} mengundang Anda sebagai ${role} di workspace "${workspace.name}".\n\nBuka link ini untuk menerima undangan:\n${inviteLink}\n\nUndangan berlaku 7 hari.`
  }).catch((error) => {
    console.error('[invite] email send failed:', error);
  });

  return {
    invite: {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      expiresAt: invite.expiresAt
    }
  };
}

export async function deleteInviteHandler({
  user,
  workspace,
  membership,
  params,
  set
}: Ctx<unknown, InviteParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  if (membership.role !== 'owner') {
    set.status = 403;
    return { error: 'Owner access required' };
  }

  const deleted = await deleteInvite(workspace.id, params.inviteId);
  if (!deleted) {
    set.status = 404;
    return { error: 'Invite not found or already accepted' };
  }

  return { ok: true };
}

export async function resendInviteHandler({
  user,
  workspace,
  membership,
  params,
  set
}: Ctx<unknown, InviteParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  if (membership.role !== 'owner') {
    set.status = 403;
    return { error: 'Owner access required' };
  }

  const row = await getInviteById(workspace.id, params.inviteId);
  if (!row) {
    set.status = 404;
    return { error: 'Invite not found' };
  }

  const { invite, workspaceName } = row;
  if (invite.acceptedAt) {
    set.status = 400;
    return { error: 'Invite already accepted' };
  }

  // Extend expiry and re-send email
  const updated = await extendInviteExpiry(invite.id);
  const inviteLink = `${env.appUrl}/invite/${updated.token}`;

  sendEmail({
    to: invite.email,
    subject: `${user.name} mengundang Anda ke "${workspaceName}"`,
    html: [
      `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px">`,
      `<h2 style="margin:0 0 8px">Anda diundang ke "${workspaceName}"</h2>`,
      `<p style="margin:0 0 16px;color:#555">${user.name} mengundang Anda sebagai <strong>${invite.role}</strong> di workspace Flowboard.</p>`,
      `<p style="margin:0 0 24px">Klik tombol di bawah untuk menerima undangan:</p>`,
      `<a href="${inviteLink}" style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Terima Undangan</a>`,
      `<p style="margin:24px 0 0;color:#999;font-size:13px">Atau salin link ini: ${inviteLink}</p>`,
      `<p style="margin:16px 0 0;color:#999;font-size:13px">Undangan berlaku 7 hari.</p>`,
      `</div>`
    ].join(''),
    text: `${user.name} mengundang Anda sebagai ${invite.role} di workspace "${workspaceName}".\n\nBuka link ini untuk menerima undangan:\n${inviteLink}\n\nUndangan berlaku 7 hari.`
  }).catch((error) => {
    console.error('[invite:resend] email send failed:', error);
  });

  return {
    ok: true,
    invite: {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      token: updated.token,
      expiresAt: updated.expiresAt
    }
  };
}

export async function removeMember({
  user,
  workspace,
  membership,
  params,
  set
}: Ctx<unknown, MemberParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  if (membership.role !== 'owner') {
    set.status = 403;
    return { error: 'Owner access required' };
  }

  if (params.userId === user.id) {
    set.status = 400;
    return { error: 'Cannot remove yourself' };
  }

  const target = await getMembership(workspace.id, params.userId);
  if (!target) {
    set.status = 404;
    return { error: 'Member not found' };
  }

  if (target.role === 'owner') {
    const owners = await countWorkspaceOwners(workspace.id);
    if (owners <= 1) {
      set.status = 400;
      return { error: 'Cannot remove the only owner' };
    }
  }

  await removeWorkspaceMember(workspace.id, params.userId);
  return { ok: true };
}

export async function showInvite({ params, set }: Ctx<unknown, TokenParams>) {
  const row = await getInviteByToken(params.token);
  if (!row) {
    set.status = 404;
    return { error: 'Invite not found' };
  }

  const { invite, workspaceName } = row;

  if (invite.acceptedAt) {
    set.status = 410;
    return { error: 'Invite already used' };
  }

  if (invite.expiresAt < new Date()) {
    set.status = 410;
    return { error: 'Invite expired' };
  }

  return {
    invite: {
      email: invite.email,
      workspaceName,
      role: invite.role,
      expiresAt: invite.expiresAt
    }
  };
}

export async function switchActive({
  user,
  workspace,
  membership,
  set
}: Ctx<unknown, WorkspaceIdParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  const result = await setActiveWorkspace(user.id, workspace.id);
  if ('error' in result) {
    set.status = 403;
    return { error: result.error };
  }

  const ctx = await getActiveWorkspaceContext(user.id, workspace.id);
  if (!ctx) {
    set.status = 500;
    return { error: 'Failed to resolve workspace' };
  }

  return { ok: true as const, workspace: toPublicWorkspace(ctx.workspace, ctx.role) };
}

export async function acceptInvite({ user, body, set }: Ctx<AcceptInviteBody>) {
  if (!user) {
    set.status = 401;
    return { error: 'Unauthorized' };
  }

  const result = await acceptWorkspaceInvite(body.token, user.id, user.email);
  if ('error' in result) {
    set.status = 400;
    return { error: result.error };
  }

  return { ok: true, workspaceId: result.workspaceId, alreadyMember: result.alreadyMember };
}
//hmr5
