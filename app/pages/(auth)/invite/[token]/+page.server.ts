import { api, ApiError } from '$lib/api/client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent, fetch }) => {
  const { user } = await parent();

  try {
    const { invite } = await api.getInvite(params.token, fetch);
    return { invite, user, token: params.token };
  } catch (err) {
    if (err instanceof ApiError) {
      return { invite: null, error: err.message, user, token: params.token };
    }
    if (import.meta.env.DEV) {
      const message =
        err instanceof Error ? err.message : 'Gagal memuat undangan. Coba refresh halaman.';
      return { invite: null, error: message, user, token: params.token };
    }
    throw err;
  }
};
