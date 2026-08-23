import type { Workspace, WorkspaceRole } from '@db';

export type PublicWorkspace = {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
};

export type PublicWorkspaceMember = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: WorkspaceRole;
  joinedAt: Date;
};

export type PublicWorkspaceInvite = {
  id: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: Date;
  createdAt: Date;
};

export const toPublicWorkspace = (
  workspace: Pick<Workspace, 'id' | 'name' | 'slug'>,
  role: WorkspaceRole
): PublicWorkspace => ({
  id: workspace.id,
  name: workspace.name,
  slug: workspace.slug,
  role
});
