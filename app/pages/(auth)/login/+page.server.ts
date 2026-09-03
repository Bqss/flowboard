import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Already signed in? Skip the form. */
export const load: PageServerLoad = async ({ parent, url }) => {
  const { user } = await parent();
  const redirectTo = url.searchParams.get('redirect') || '/dashboard';
  const email = url.searchParams.get('email') || '';
  if (user) throw redirect(302, redirectTo);
  return { redirectTo, email };
};
