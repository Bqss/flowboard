<script lang="ts">
  import '../../ds.css';
  import { page } from '$app/stores';
  import { authCopy } from '$lib/i18n/auth.js';
  import { locale, locales, setLocale } from '$lib/i18n/index.js';
  import LandingLogo from '$lib/components/landing/atoms/Logo.svelte';
  import { Button } from '$lib/components/atoms/index.js';
  import ThemeToggle from '$lib/components/molecules/ThemeToggle.svelte';

  let { children }: { children: import('svelte').Snippet } = $props();

  const copy = $derived(authCopy[$locale]);
  const isRegister = $derived($page.url.pathname === '/register');
</script>

{#snippet languageSwitcher()}
  <div
    class="inline-flex items-center gap-0.5 rounded-full border border-hairline bg-lane p-1"
    role="group"
    aria-label={copy.shell.language.label}
  >
    {#each locales as language (language.code)}
      <button
        type="button"
        aria-pressed={$locale === language.code}
        aria-label={copy.shell.language.options[language.code]}
        title={copy.shell.language.options[language.code]}
        onclick={() => setLocale(language.code)}
        class="inline-flex h-7 min-w-8 items-center justify-center rounded-full px-2 text-[11px] font-bold tracking-[0.04em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1 {$locale === language.code ? 'bg-card text-ink shadow-control' : 'text-mute hover:text-ink'}"
      >
        {language.short}
      </button>
    {/each}
  </div>
{/snippet}

<div data-theme="app" class="relative flex min-h-screen flex-col overflow-hidden bg-canvas text-body">
  <div class="pointer-events-none absolute inset-x-0 top-16 h-px bg-hairline" aria-hidden="true"></div>

  <header class="relative z-10 px-6 py-5 md:px-10">
    <nav class="mx-auto flex h-10 max-w-[1240px] items-center justify-between gap-4">
      <LandingLogo size="md" />

      <div class="flex items-center gap-2 sm:gap-3">
        {@render languageSwitcher()}
        <ThemeToggle size="sm" labels={copy.shell.theme} />
        {#if isRegister}
          <Button variant="secondary" size="sm" href="/login" class="hidden sm:inline-flex">
            {copy.shell.header.signIn}
          </Button>
        {:else}
          <Button variant="primary" size="sm" href="/register" class="hidden sm:inline-flex">
            {copy.shell.header.startFree}
          </Button>
        {/if}
      </div>
    </nav>
  </header>

  <main class="relative z-10 flex w-full flex-1 items-center justify-center px-6 pb-10 pt-6 lg:pb-16 lg:pt-10">

    <div class="w-full max-w-md">
      {@render children()}
    </div>
  </main>

  <footer class="relative z-10 mx-auto w-full max-w-[1240px] px-6 py-6 md:px-10">
    <p class="border-t border-hairline pt-5 text-center text-xs font-semibold text-faint">{copy.shell.footer}</p>
  </footer>
</div>
