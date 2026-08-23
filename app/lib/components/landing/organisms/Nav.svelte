<script lang="ts">
  import { page } from '$app/stores';
  import { goto, invalidateAll } from '$app/navigation';
  import { api } from '$lib/api/client';
  import Logo from '../atoms/Logo.svelte';
  import Button from '../atoms/Button.svelte';
  import ThemeToggle from '$lib/components/molecules/ThemeToggle.svelte';

  type NavUser = { email: string; name: string } | null;

  let { user = null }: { user?: NavUser } = $props();

  const links = [
    { href: '#features', label: 'Features' },
    { href: '#how-it-works', label: 'How it works' },
    { href: '#use-cases', label: 'Example journey' }
  ];

  let open = $state(false);
  let loggingOut = $state(false);

  async function logout() {
    loggingOut = true;
    try {
      await api.logout();
      await invalidateAll();
      await goto('/login');
    } finally {
      loggingOut = false;
      open = false;
    }
  }
</script>

<header class="fixed inset-x-0 top-0 z-50 border-b border-hairline bg-canvas/95 backdrop-blur-xl">
  <nav class="mx-auto flex h-14 max-w-[1240px] items-center justify-between gap-4 px-6">
    <div class="flex min-w-0 items-center gap-3 md:gap-8">
      <button
        type="button"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink md:hidden"
        onclick={() => (open = !open)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {#if open}
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          {:else}
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          {/if}
        </svg>
      </button>

      <Logo />

      <div class="hidden items-center gap-7 md:flex">
        {#each links as link (link.href)}
          <a
            href={link.href}
            class="text-[13px] font-medium text-mute transition-colors hover:text-ink"
          >
            {link.label}
          </a>
        {/each}
      </div>
    </div>

    <div class="flex shrink-0 items-center gap-3">
      <div class="hidden items-center gap-3 md:flex">
        <ThemeToggle size="sm" />
        {#if user}
          <a
            href="/dashboard"
            class="text-[13px] font-medium text-mute transition-colors hover:text-ink"
            class:!text-ink={$page.url.pathname === '/dashboard'}
          >
            Open workspace
          </a>
          <Button variant="tertiary" size="sm" onclick={logout} loading={loggingOut}>Sign out</Button>
        {:else}
          <a href="/login" class="text-[13px] font-medium text-mute transition-colors hover:text-ink">Sign in</a>
          <Button variant="primary" size="sm" href="/register">Start free</Button>
        {/if}
      </div>

      <div class="flex items-center gap-2 md:hidden">
        <ThemeToggle size="sm" />
        {#if user}
          <Button variant="primary" size="sm" href="/dashboard">Workspace</Button>
        {:else}
          <Button variant="primary" size="sm" href="/register">Start</Button>
        {/if}
      </div>
    </div>
  </nav>

  {#if open}
    <div class="border-t border-hairline bg-canvas/95 backdrop-blur-xl md:hidden">
      <div class="flex flex-col gap-1 px-6 py-4">
        {#each links as link (link.href)}
          <a
            href={link.href}
            onclick={() => (open = false)}
            class="rounded-md px-2 py-2.5 text-sm text-body hover:bg-elevated hover:text-ink"
          >
            {link.label}
          </a>
        {/each}
        <div class="mt-2 flex flex-col gap-2 border-t border-hairline pt-3">
          {#if user}
            <Button variant="tertiary" size="md" full href="/dashboard">Open workspace</Button>
            <Button variant="secondary" size="md" full onclick={logout} loading={loggingOut}>Sign out</Button>
          {:else}
            <Button variant="secondary" size="md" full href="/login">Sign in</Button>
            <Button variant="primary" size="md" full href="/register">Start free</Button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</header>
