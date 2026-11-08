const VERSION = new URL(self.location.href).searchParams.get('v') ?? 'dev';
const CACHE_NAME = `flowboard-static-${VERSION}`;
const CACHEABLE_DESTINATIONS = new Set(['script', 'style', 'image', 'font']);

const getNotificationTarget = (value) => {
  try {
    const url = new URL(typeof value === 'string' ? value : '/dashboard', self.location.origin);
    if (url.origin !== self.location.origin) return '/dashboard';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/dashboard';
  }
};

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('flowboard-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('push', (event) => {
  let payload;
  try {
    payload = event.data?.json();
  } catch {
    return;
  }
  if (
    !payload ||
    typeof payload.notificationId !== 'string' ||
    typeof payload.workspaceId !== 'string' ||
    typeof payload.title !== 'string' ||
    typeof payload.body !== 'string'
  ) {
    return;
  }

  const notification = {
    notificationId: payload.notificationId,
    workspaceId: payload.workspaceId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    appBody: typeof payload.appBody === 'string' ? payload.appBody : payload.body,
    url: getNotificationTarget(payload.url)
  };

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      const visibleClient = clients.find(
        (client) => new URL(client.url).origin === self.location.origin && client.visibilityState === 'visible'
      );
      if (visibleClient) {
        visibleClient.postMessage({ type: 'FLOWBOARD_PUSH_NOTIFICATION', notification });
        return;
      }

      const icon = new URL('/web-app-manifest-192x192.png', self.location.origin).href;
      const badge = new URL('/favicon-96x96.png', self.location.origin).href;
      await self.registration.showNotification(notification.title, {
        body: notification.body,
        icon,
        badge,
        tag: `flowboard:${notification.notificationId}`,
        renotify: false,
        silent: false,
        vibrate: [100],
        data: notification,
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data ?? {};
  const target = new URL(getNotificationTarget(data.url), self.location.origin);
  if (typeof data.notificationId === 'string') {
    target.searchParams.set('notificationId', data.notificationId);
  }
  if (typeof data.workspaceId === 'string') {
    target.searchParams.set('notificationWorkspaceId', data.workspaceId);
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      const sameOriginClient = clients.find((client) => new URL(client.url).origin === self.location.origin);
      if (sameOriginClient) {
        await sameOriginClient.navigate(target.href);
        await sameOriginClient.focus();
        return;
      }
      await self.clients.openWindow(target.href);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Never cache API responses or authenticated HTML documents.
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    request.destination === 'document' ||
    !CACHEABLE_DESTINATIONS.has(request.destination)
  ) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            void cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached ?? Response.error());

      return cached ?? network;
    })
  );
});
