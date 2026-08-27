import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/** Admin area requires a signed-in platform admin. */
export const load: LayoutServerLoad = async ({ parent }) => {
  const { user } = await parent();
  if (!user) throw redirect(302, '/login');
  if (!user.platformAdmin) throw redirect(302, '/dashboard');
  return { user };
};
