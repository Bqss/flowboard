<script lang="ts">
  import { locale } from '$lib/i18n/index.js';
  import Button from '../atoms/Button.svelte';
  import AlertBanner from './AlertBanner.svelte';

  let registration: ServiceWorkerRegistration | null = null;
  let updateAvailable = $state(false);
  let dismissed = $state(false);
  let applying = $state(false);

  const SERVICE_WORKER_URL = `/sw.js?v=${encodeURIComponent(__FLOWBOARD_VERSION__)}`;

  const copy = $derived(
    $locale === 'ms'
      ? {
          title: 'Kemas kini tersedia',
          description: 'Muat semula Flowboard untuk menggunakan versi terkini.',
          update: 'Kemas kini',
          updating: 'Mengemas kini…',
          later: 'Nanti'
        }
      : {
          title: 'Update available',
          description: 'Reload Flowboard to use the latest version.',
          update: 'Update now',
          updating: 'Updating…',
          later: 'Later'
        }
  );

  function applyUpdate() {
    const waitingWorker = registration?.waiting;
    if (!waitingWorker || applying) {
      if (!waitingWorker) updateAvailable = false;
      return;
    }

    applying = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }

  $effect(() => {
    if (!__FLOWBOARD_PRODUCTION__ || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let disposed = false;

    const handleControllerChange = () => {
      if (applying) window.location.reload();
    };

    const handleUpdateFound = () => {
      const installingWorker = registration?.installing;
      if (!installingWorker) return;

      const showUpdate = () => {
        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
          updateAvailable = true;
        }
      };

      installingWorker.addEventListener('statechange', showUpdate);
      showUpdate();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    void navigator.serviceWorker
      .register(SERVICE_WORKER_URL, { scope: '/' })
      .then((nextRegistration) => {
        if (disposed) return;

        registration = nextRegistration;
        nextRegistration.addEventListener('updatefound', handleUpdateFound);
        handleUpdateFound();

        if (nextRegistration.waiting && navigator.serviceWorker.controller) {
          updateAvailable = true;
        }
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      registration?.removeEventListener('updatefound', handleUpdateFound);
    };
  });
</script>

{#if updateAvailable && !dismissed}
  <AlertBanner
    title={copy.title}
    dismissible={false}
    class="fixed inset-x-4 bottom-4 z-[251] mx-auto max-w-md rounded-xl shadow-popover"
  >
    <p>{copy.description}</p>
    <div class="mt-3 flex flex-wrap justify-end gap-2">
      <Button variant="ghost" size="sm" onclick={() => (dismissed = true)}>{copy.later}</Button>
      <Button size="sm" loading={applying} onclick={applyUpdate}>
        {applying ? copy.updating : copy.update}
      </Button>
    </div>
  </AlertBanner>
{/if}
