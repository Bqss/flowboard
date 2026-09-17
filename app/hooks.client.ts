import { invalidateAll } from '$app/navigation';

if (import.meta.hot) {
  import.meta.hot.on('flowboard:api-reload', () => {
    void invalidateAll();
  });
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
  });
}
