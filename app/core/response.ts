import type { User } from '../db';

/** The user shape safe to expose over the API (never leaks the password hash). */
export type PublicUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  activeWorkspaceId: string | null;
  platformAdmin: boolean;
};

export const toPublicUser = (
  u: Pick<User, 'id' | 'email' | 'name' | 'phone' | 'avatarUrl' | 'activeWorkspaceId' | 'platformAdmin'>
): PublicUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
  phone: u.phone,
  avatarUrl: u.avatarUrl,
  activeWorkspaceId: u.activeWorkspaceId,
  platformAdmin: u.platformAdmin
});
