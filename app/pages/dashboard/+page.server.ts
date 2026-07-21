import { redirect } from '@sveltejs/kit';
import { api } from '$lib/api/client';
import type { PageServerLoad } from './$types';

/**
 * Protected page. The current user is already resolved by the root layout
 * load, so we reuse it via `parent()` (no second `/api/auth/me` call). If
 * there's no user, redirect to login; otherwise fetch the data this page needs.
 */
export const load: PageServerLoad = async ({ parent, fetch }) => {
  const { user } = await parent();
  if (!user) throw redirect(302, '/login');

  const { users } = await api.listUsers(fetch);
  return { users };
};
