/**
 * Tiny fetch wrapper for talking to the Elysia API.
 *
 * All calls are same-origin (`/api/...`) so the session cookie rides along
 * automatically. On the server (SSR) pass SvelteKit's `fetch` so requests
 * are resolved internally without a network hop.
 */

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type FetchLike = typeof fetch;

async function request<T>(
  path: string,
  options: RequestInit & { fetch?: FetchLike } = {}
): Promise<T> {
  const { fetch: fetchFn = fetch, headers, ...rest } = options;

  const res = await fetchFn(`/api${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : res.statusText) || 'Request failed';
    throw new ApiError(res.status, message, payload);
  }

  return payload as T;
}

export const api = {
  /** Generic GET for endpoints without a dedicated helper. */
  get: <T>(path: string, fetchFn?: FetchLike) => request<T>(path, { fetch: fetchFn }),

  register: (body: { email: string; name: string; password: string }, fetchFn?: FetchLike) =>
    request<{ user: ApiUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
      fetch: fetchFn
    }),

  login: (body: { email: string; password: string }, fetchFn?: FetchLike) =>
    request<{ user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
      fetch: fetchFn
    }),

  logout: (fetchFn?: FetchLike) =>
    request<{ ok: true }>('/auth/logout', { method: 'POST', fetch: fetchFn }),

  me: (fetchFn?: FetchLike) => request<{ user: ApiUser }>('/auth/me', { fetch: fetchFn }),

  listUsers: (fetchFn?: FetchLike) => request<{ users: ApiUser[] }>('/users', { fetch: fetchFn }),

  createUser: (body: { email: string; name: string; password: string }, fetchFn?: FetchLike) =>
    request<{ user: ApiUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
      fetch: fetchFn
    }),

  updateUser: (id: string, body: { name: string }, fetchFn?: FetchLike) =>
    request<{ user: ApiUser }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      fetch: fetchFn
    }),

  deleteUser: (id: string, fetchFn?: FetchLike) =>
    request<{ ok: boolean }>(`/users/${id}`, { method: 'DELETE', fetch: fetchFn }),

  changePassword: (body: { currentPassword: string; newPassword: string }, fetchFn?: FetchLike) =>
    request<{ ok: true }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
      fetch: fetchFn
    }),

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch('/api/auth/avatar', {
      method: 'POST',
      body: formData
    });
    const payload = await res.json();
    if (!res.ok) throw new ApiError(res.status, payload.error || 'Upload failed');
    return payload as { ok: true; avatarUrl: string };
  }
};
