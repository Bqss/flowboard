<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { mode, toggleMode } from 'mode-watcher';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import {
    Cancel01Icon,
    Menu01Icon,
    Moon02Icon,
    Sun03Icon
  } from '@hugeicons/core-free-icons';
  import { api } from '$lib/api/client';
  import { locale, locales, setLocale } from '$lib/i18n/index.js';
  import { landingCopy } from '$lib/i18n/landing.js';
  import Logo from '../atoms/Logo.svelte';
  import Button from '../atoms/Button.svelte';

  type NavUser = { email: string; name: string } | null;

  let { user = null }: { user?: NavUser } = $props();
  const copy = $derived(landingCopy[$locale]);
  const links = $derived(copy.nav.links);
  const isDark = $derived(mode.current === 'dark');
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

{#snippet languageSwitcher(compact = false)}
  <div
    class="inline-flex items-center rounded-full bg-lane/80 p-1"
    role="group"
    aria-label={copy.language.label}
  >
    {#each locales as language (language.code)}
      <button
        type="button"
        aria-pressed={$locale === language.code}
        aria-label={copy.language.options[language.code]}
        title={copy.language.options[language.code]}
        onclick={() => setLocale(language.code)}
        class="inline-flex h-7 items-center justify-center rounded-full px-2.5 text-[10px] font-semibold tracking-[0.06em] transition-[background-color,color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none {$locale === language.code ? 'bg-card text-ink shadow-[0_2px_8px_rgba(47,46,101,0.1)]' : 'text-mute hover:text-ink'} {compact ? 'min-w-8' : 'min-w-9'}"
      >
        {language.short}
      </button>
    {/each}
  </div>
{/snippet}

<a
  href="#main-content"
  class="fixed left-4 top-3 z-50 -translate-y-20 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-transform duration-300 focus:translate-y-0"
>
  {$locale === 'en' ? 'Skip to main content' : 'Langkau ke kandungan utama'}
</a>

<header class="pointer-events-none fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6 sm:pt-5">
  <nav class="nav-island pointer-events-auto mx-auto flex h-15 max-w-[1320px] items-center rounded-full px-3 pl-4 sm:h-16 sm:px-4 sm:pl-5" aria-label="Primary navigation">
    <div class="flex flex-1 items-center">
      <Logo />
    </div>

    <div class="hidden items-center gap-1 lg:flex">
      {#each links as link (link.href)}
        <a
          href={link.href}
          class="nav-link rounded-full px-3.5 py-2 text-[13px] font-semibold tracking-[-0.01em] text-mute transition-[background-color,color] duration-300 hover:bg-lane/70 hover:text-ink"
        >
          {link.label}
        </a>
      {/each}
    </div>

    <div class="flex flex-1 items-center justify-end gap-1.5 sm:gap-2">

      <div class="hidden sm:block">{@render languageSwitcher()}</div>
      <button
        type="button"
        onclick={toggleMode}
        aria-label={isDark ? 'Use light theme' : 'Use dark theme'}
        title={isDark ? 'Use light theme' : 'Use dark theme'}
        class="grid size-9 place-items-center rounded-full text-ink transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-lane active:scale-95"
      >
        <HugeiconsIcon icon={isDark ? Moon02Icon : Sun03Icon} size={17} strokeWidth={1.8} />
      </button>

      {#if user}
        <div class="hidden items-center gap-2 md:flex">
          <Button variant="tertiary" size="sm" onclick={logout} loading={loggingOut}>{copy.nav.signOut}</Button>
          <Button variant="primary" size="sm" href="/dashboard">{copy.nav.openWorkspace}</Button>
        </div>
      {:else}
        <a href="/login" class="hidden rounded-full px-3 py-2 text-[13px] font-semibold text-mute transition-colors duration-300 hover:bg-lane/70 hover:text-ink md:inline-flex">
          {copy.nav.signIn}
        </a>
        <Button variant="primary" size="sm" href="/register">{copy.nav.startFree}</Button>
      {/if}

      <button
        type="button"
        class="grid size-9 place-items-center rounded-full text-ink transition-[background-color,transform] duration-300 hover:bg-lane active:scale-95 lg:hidden"
        onclick={() => (open = !open)}
        aria-label={open ? copy.nav.closeMenu : copy.nav.openMenu}
        aria-expanded={open}
      >
        <HugeiconsIcon icon={open ? Cancel01Icon : Menu01Icon} size={18} strokeWidth={1.8} />
      </button>
    </div>
  </nav>

  {#if open}
    <div class="nav-drawer pointer-events-auto mx-auto mt-2 max-w-[1320px] rounded-[24px] p-3 lg:hidden">
      <nav class="grid gap-1" aria-label="Mobile navigation">
        {#each links as link (link.href)}
          <a
            href={link.href}
            onclick={() => (open = false)}
            class="rounded-2xl px-4 py-3.5 text-base font-semibold tracking-[-0.02em] text-ink transition-colors duration-300 hover:bg-lane"
          >
            {link.label}
          </a>
        {/each}
      </nav>
      <div class="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-lane/70 p-2 pl-3 sm:hidden">
        {@render languageSwitcher(true)}
        {#if user}
          <Button variant="secondary" size="sm" href="/dashboard">{copy.nav.workspace}</Button>
        {:else}
          <Button variant="secondary" size="sm" href="/login">{copy.nav.signIn}</Button>
        {/if}
      </div>
    </div>
  {/if}
</header>

<style>
  .nav-island,
  .nav-drawer {
    background: color-mix(in oklab, var(--color-card) 84%, transparent);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    backdrop-filter: blur(24px) saturate(160%);
    box-shadow:
      0 12px 36px rgba(46, 43, 102, 0.1),
      0 2px 8px rgba(46, 43, 102, 0.06),
      inset 0 1px 0 color-mix(in oklab, white 72%, transparent),
      inset 0 0 0 1px color-mix(in oklab, var(--color-hairline) 68%, transparent);
  }

  @starting-style {
    .nav-drawer {
      opacity: 0;
      transform: translateY(-10px) scale(0.98);
    }
  }

  .nav-drawer {
    transition:
      opacity 400ms cubic-bezier(0.16, 1, 0.3, 1),
      transform 400ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  @media (prefers-reduced-transparency: reduce) {
    .nav-island,
    .nav-drawer {
      background: var(--color-card);
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .nav-drawer {
      transition: none;
    }
  }
</style>
