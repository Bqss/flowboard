import { invalidateAll } from '$app/navigation';

if (import.meta.hot) {
  import.meta.hot.on('flowboard:api-reload', () => {
    void invalidateAll();
  });
}
