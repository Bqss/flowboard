<script lang="ts">
  import '../../ds.css';
  import { page } from '$app/stores';
  import { authCopy } from '$lib/i18n/auth.js';
  import { locale, locales, setLocale } from '$lib/i18n/index.js';
  import { landingCopy } from '$lib/i18n/landing.js';
  import LandingLogo from '$lib/components/landing/atoms/Logo.svelte';
  import { Button } from '$lib/components/atoms/index.js';
  import ThemeToggle from '$lib/components/molecules/ThemeToggle.svelte';

  let { children }: { children: import('svelte').Snippet } = $props();

  const copy = $derived(authCopy[$locale]);
  const heroCopy = $derived(landingCopy[$locale].hero);
  const isRegister = $derived($page.url.pathname === '/register');

  const stageMarkers = [
    'bg-status-queued',
    'bg-status-progress',
    'bg-status-urgent',
    'bg-status-done'
  ];
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

<div data-theme="app" class="relative min-h-screen bg-canvas text-body lg:grid lg:grid-cols-[1.05fr_1fr]">

  <!-- Brand panel — desktop only -->
  <aside class="relative hidden flex-col justify-between overflow-hidden bg-canvas-sunken p-10 lg:flex xl:p-14" aria-hidden="true">
    <!-- Decorative circles -->
    <div class="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/5"></div>
    <div class="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-primary/10"></div>
    <div class="pointer-events-none absolute right-1/3 top-1/2 h-40 w-40 rounded-full bg-primary/5"></div>

    <!-- Top: logo -->
    <div class="relative z-10">
      <LandingLogo size="lg" />
    </div>

    <!-- Middle: value proposition -->
    <div class="relative z-10 max-w-md">
      <h2 class="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-extrabold leading-[1.12] tracking-[-0.035em] text-ink">
        {heroCopy.title}
      </h2>
      <p class="mt-5 text-lg leading-[1.6] text-body">
        {heroCopy.body}
      </p>
    </div>

    <!-- Bottom: workflow stages visualization -->
    <div class="relative z-10 max-w-md">
      <div class="rounded-2xl border border-hairline bg-card p-6 shadow-card">
        <div class="flex items-center justify-between gap-4 border-b border-hairline pb-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{heroCopy.recordLabel}</p>
            <p class="mt-1.5 text-sm font-bold text-ink">{heroCopy.recordTitle}</p>
          </div>
          <span class="rounded-full border border-primary-border bg-primary-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-primary-ink">{heroCopy.illustrative}</span>
        </div>

        <div class="relative mt-6">
          <div class="pointer-events-none absolute inset-x-[11%] top-1.5 h-0.5 rounded-full bg-hairline-strong" aria-hidden="true">
            <div class="h-full w-2/3 rounded-full bg-status-urgent"></div>
          </div>

          <div class="relative grid grid-cols-4 gap-2">
            {#each heroCopy.stages as stage, i}
              <div class="flex min-w-0 flex-col items-center gap-2 text-center">
                <span
                  class="relative z-10 h-3 w-3 rounded-full border-2 border-card {stageMarkers[i]} {i === 2 ? 'ring-2 ring-status-urgent/25' : ''}"
                ></span>
                <span class="text-xs font-semibold text-ink">{stage.label}</span>
              </div>
            {/each}
          </div>
        </div>

        <div class="mt-6 border-t border-hairline pt-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{heroCopy.nextAction}</p>
          <p class="mt-1.5 text-sm font-bold text-ink">{heroCopy.reviewReply}</p>
        </div>
      </div>

      <p class="mt-5 text-center text-xs font-semibold text-faint">{copy.shell.footer}</p>
    </div>
  </aside>

  <!-- Form panel -->
  <div class="relative flex min-h-screen flex-col">

    <header class="relative z-10 px-6 py-5 md:px-10">
      <nav class="mx-auto flex h-10 max-w-md items-center justify-between gap-4">
        <LandingLogo size="md" class="lg:hidden" />

        <div class="flex items-center gap-2 sm:gap-3 lg:ml-auto">
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

    <main class="relative z-10 flex w-full flex-1 items-center justify-center px-6 py-8">
      <div class="w-full max-w-md">
        {@render children()}
      </div>
    </main>

    <footer class="relative z-10 mx-auto w-full max-w-md px-6 py-6 md:px-10">
      <p class="border-t border-hairline pt-5 text-center text-xs font-semibold text-faint">{copy.shell.footer}</p>
    </footer>

  </div>

</div>
