import { api } from '$lib/api/client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    const { users } = await api.listUsers(fetch);
    return { users };
  } catch (err) {
    return { users: [] };
  }
};
