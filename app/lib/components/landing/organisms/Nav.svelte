<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { api } from '$lib/api/client';
  import { locale, locales, setLocale } from '$lib/i18n/index.js';
  import { landingCopy } from '$lib/i18n/landing.js';
  import Logo from '../atoms/Logo.svelte';
  import Button from '../atoms/Button.svelte';
  import ThemeToggle from '$lib/components/molecules/ThemeToggle.svelte';

  type NavUser = { email: string; name: string } | null;

  let { user = null }: { user?: NavUser } = $props();
  const copy = $derived(landingCopy[$locale]);
  const links = $derived(copy.nav.links);

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

{#snippet languageSwitcher()}
  <div
    class="inline-flex items-center gap-0.5 rounded-full border border-hairline bg-lane p-1"
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
        class="inline-flex h-7 min-w-8 items-center justify-center rounded-full px-2 text-[11px] font-bold tracking-[0.04em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1 {$locale === language.code ? 'bg-card text-ink shadow-control' : 'text-mute hover:text-ink'}"
      >
        {language.short}
      </button>
    {/each}
  </div>
{/snippet}

<header class="fixed inset-x-0 top-0 z-50 border-b border-hairline bg-card shadow-control">
  <nav class="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-6">
    <div class="flex min-w-0 items-center gap-3 md:gap-8">
      <button
        type="button"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-lane md:hidden"
        onclick={() => (open = !open)}
        aria-label={open ? copy.nav.closeMenu : copy.nav.openMenu}
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
            class="text-sm font-semibold text-mute transition-colors hover:text-ink"
          >
            {link.label}
          </a>
        {/each}
      </div>
    </div>

    <div class="flex shrink-0 items-center gap-3">
      <div class="hidden items-center gap-3 md:flex">
        {@render languageSwitcher()}
        <ThemeToggle size="sm" />
        {#if user}
          <a
            href="/dashboard"
            class="text-sm font-semibold text-mute transition-colors hover:text-ink"
          >
            {copy.nav.openWorkspace}
          </a>
          <Button variant="tertiary" size="sm" onclick={logout} loading={loggingOut}>{copy.nav.signOut}</Button>
        {:else}
          <a href="/login" class="text-sm font-semibold text-mute transition-colors hover:text-ink">{copy.nav.signIn}</a>
          <Button variant="primary" size="sm" href="/register">{copy.nav.startFree}</Button>
        {/if}
      </div>

      <div class="flex items-center gap-2 md:hidden">
        {@render languageSwitcher()}
        <ThemeToggle size="sm" />
        {#if user}
          <Button variant="primary" size="sm" href="/dashboard">{copy.nav.workspace}</Button>
        {:else}
          <Button variant="primary" size="sm" href="/register">{copy.nav.start}</Button>
        {/if}
      </div>
    </div>
  </nav>

  {#if open}
    <div class="border-t border-hairline bg-card md:hidden">
      <div class="flex flex-col gap-1 px-6 py-4">
        {#each links as link (link.href)}
          <a
            href={link.href}
            onclick={() => (open = false)}
            class="rounded-lg px-3 py-3 text-sm font-semibold text-body transition-colors hover:bg-lane hover:text-ink"
          >
            {link.label}
          </a>
        {/each}
        <div class="mt-3 flex flex-col gap-2 border-t border-hairline pt-4">
          {#if user}
            <Button variant="tertiary" size="md" full href="/dashboard">{copy.nav.openWorkspace}</Button>
            <Button variant="secondary" size="md" full onclick={logout} loading={loggingOut}>{copy.nav.signOut}</Button>
          {:else}
            <Button variant="secondary" size="md" full href="/login">{copy.nav.signIn}</Button>
            <Button variant="primary" size="md" full href="/register">{copy.nav.startFree}</Button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</header>
