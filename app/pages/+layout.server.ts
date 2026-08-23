import { api, ApiError } from '$lib/api/client';
import type { LayoutServerLoad } from './$types';

/**
 * Loads the current user once per navigation so the whole app (nav bar, page
 * guards) can react to auth state. Returns `null` when not logged in instead
 * of throwing, so public pages still render.
 */
export const load: LayoutServerLoad = async ({ fetch }) => {
  try {
    const data = await api.me(fetch);
    return { user: data.user, workspace: data.workspace };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return { user: null, workspace: null };
    }
    throw err;
  }
};
