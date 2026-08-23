import type { User } from '../db';

/** The user shape safe to expose over the API (never leaks the password hash). */
export type PublicUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  activeWorkspaceId: string | null;
};

export const toPublicUser = (
  u: Pick<User, 'id' | 'email' | 'name' | 'avatarUrl' | 'activeWorkspaceId'>
): PublicUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
  avatarUrl: u.avatarUrl,
  activeWorkspaceId: u.activeWorkspaceId
});
