<script lang="ts">
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { Cancel01Icon, Download04Icon } from '@hugeicons/core-free-icons';
  import { locale } from '$lib/i18n/index.js';
  import Button from '../atoms/Button.svelte';

  type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  };

  const DISMISS_KEY = 'actjom-pwa-install-dismissed';

  let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);
  let visible = $state(false);
  let installing = $state(false);

  const copy = $derived(
    $locale === 'ms'
      ? {
          title: 'Pasang ActJom',
          description: 'Akses workspace lebih pantas dari skrin utama.',
          install: 'Pasang aplikasi',
          close: 'Tutup'
        }
      : {
          title: 'Install ActJom',
          description: 'Open your workspace faster from your home screen.',
          install: 'Install app',
          close: 'Close'
        }
  );

  function isStandalone() {
    const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
    return window.matchMedia('(display-mode: standalone)').matches || standaloneNavigator.standalone === true;
  }

  function wasDismissed() {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  }

  function dismiss() {
    visible = false;
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Keep the widget dismissible when storage is unavailable.
    }
  }

  async function install() {
    if (!deferredPrompt || installing) return;

    installing = true;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') visible = false;
      deferredPrompt = null;
    } catch {
      visible = false;
      deferredPrompt = null;
    } finally {
      installing = false;
    }
  }

  $effect(() => {
    if (typeof window === 'undefined' || isStandalone() || wasDismissed()) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPrompt = event as BeforeInstallPromptEvent;
      visible = true;
    };

    const handleAppInstalled = () => {
      deferredPrompt = null;
      visible = false;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  });
</script>

{#if visible && deferredPrompt}
  <aside
    class="fixed inset-x-4 bottom-4 z-[250] rounded-[20px] border border-hairline bg-card p-4 shadow-[0_14px_40px_rgba(15,23,42,0.16)] sm:left-auto sm:w-[360px]"
    aria-label={copy.title}
  >
    <div class="flex items-start gap-3">
      <span class="inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
        <img src="/logo_clean.png" alt="" class="size-full scale-[2.25] object-cover" />
      </span>
      <div class="min-w-0 flex-1 pr-6">
        <p class="ds-label text-ink">{copy.title}</p>
        <p class="ds-caption mt-1 leading-relaxed text-mute">{copy.description}</p>
      </div>
      <button
        type="button"
        class="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-mute transition-colors hover:bg-lane hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        aria-label={copy.close}
        onclick={dismiss}
      >
        <HugeiconsIcon icon={Cancel01Icon} size={17} strokeWidth={1.8} />
      </button>
    </div>

    <Button class="mt-3 w-full" size="sm" onclick={install} loading={installing}>
      <HugeiconsIcon icon={Download04Icon} size={16} strokeWidth={1.8} />
      {copy.install}
    </Button>
  </aside>
{/if}
