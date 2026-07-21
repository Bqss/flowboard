import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Already signed in? Skip the form. */
export const load: PageServerLoad = async ({ parent }) => {
  const { user } = await parent();
  if (user) throw redirect(302, '/dashboard');
};
