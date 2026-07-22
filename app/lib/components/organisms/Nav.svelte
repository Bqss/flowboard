<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto, invalidateAll } from '$app/navigation';
  import { api } from '$lib/api/client';
  import Logo from '../atoms/Logo.svelte';
  import Button from '../atoms/Button.svelte';

  /**
   * Sticky primary nav. Canvas background that gains a hairline rule + blur once
   * the page scrolls past the fold. Auth-aware: shows Dashboard/Sign out when a
   * user is present, else Login/Sign up. Collapses to a drawer under 768px.
   */
  type NavUser = { email: string; name: string } | null;

  let { user = null }: { user?: NavUser } = $props();

  const links = [
    { href: '#features', label: 'Features' },
    { href: '#architecture', label: 'Architecture' },
    { href: '#stack', label: 'Stack' }
  ];

  let scrolled = $state(false);
  let open = $state(false);
  let loggingOut = $state(false);

  onMount(() => {
    const onScroll = () => (scrolled = window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  });

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

<header
  class="fixed inset-x-0 top-0 z-50 transition-colors duration-300
    {scrolled ? 'border-b border-hairline bg-canvas/80 backdrop-blur-xl' : 'border-b border-transparent'}"
>
  <nav class="mx-auto flex h-14 max-w-[1240px] items-center justify-between px-6">
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

    <div class="hidden items-center gap-3 md:flex">
      {#if user}
        <a
          href="/dashboard"
          class="text-[13px] font-medium text-mute transition-colors hover:text-ink"
          class:!text-ink={$page.url.pathname === '/dashboard'}
        >
          Dashboard
        </a>
        <Button variant="tertiary" size="sm" onclick={logout} loading={loggingOut}>
          Sign out
        </Button>
      {:else}
        <a href="/login" class="text-[13px] font-medium text-mute transition-colors hover:text-ink">
          Sign in
        </a>
        <Button variant="primary" size="sm" href="/register">Get started</Button>
      {/if}
    </div>

    <!-- mobile toggle -->
    <button
      class="flex h-9 w-9 items-center justify-center rounded-md text-ink md:hidden"
      onclick={() => (open = !open)}
      aria-label="Toggle menu"
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
  </nav>

  {#if open}
    <div class="border-t border-hairline bg-canvas/95 backdrop-blur-xl md:hidden">
      <div class="flex flex-col gap-1 px-6 py-4">
        {#each links as link (link.href)}
          <a
            href={link.href}
            onclick={() => (open = false)}
            class="rounded-md px-2 py-2.5 text-sm text-body hover:bg-white/5 hover:text-ink"
          >
            {link.label}
          </a>
        {/each}
        <div class="mt-2 flex flex-col gap-2 border-t border-hairline pt-3">
          {#if user}
            <Button variant="tertiary" size="md" full href="/dashboard">Dashboard</Button>
            <Button variant="secondary" size="md" full onclick={logout} loading={loggingOut}>
              Sign out
            </Button>
          {:else}
            <Button variant="tertiary" size="md" full href="/login">Sign in</Button>
            <Button variant="primary" size="md" full href="/register">Get started</Button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</header>
