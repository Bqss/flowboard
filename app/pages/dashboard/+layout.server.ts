import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/** Dashboard requires a signed-in user. */
export const load: LayoutServerLoad = async ({ parent }) => {
  const { user, workspace } = await parent();
  if (!user) throw redirect(302, '/login');
  return { user, workspace };
};
