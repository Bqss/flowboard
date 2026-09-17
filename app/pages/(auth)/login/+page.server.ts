import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/** Already signed in? Skip the form unless the user explicitly adds another account. */
export const load: PageServerLoad = async ({ parent, url }) => {
  const { user } = await parent();
  const addAccount = url.searchParams.get('addAccount') === '1';
  const redirectTo = url.searchParams.get('redirect') || '/dashboard';
  const email = url.searchParams.get('email') || '';
  if (user && !addAccount) throw redirect(302, redirectTo);
  return { redirectTo, email };
};
