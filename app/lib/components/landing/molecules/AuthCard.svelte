<script lang="ts">
  import type { Snippet } from 'svelte';
  import Button from '../atoms/Button.svelte';
  import Logo from '../atoms/Logo.svelte';

  /**
   * Auth form shell: centered surface card with the Flowboard mark, title/subtitle,
   * a slot for Fields, an inline error banner, the submit CTA, and a footer.
   * The card sits on the dark canvas with a hairline edge (no shadow).
   */
  let {
    title,
    subtitle,
    error = null,
    loading = false,
    submitLabel,
    loadingLabel,
    onsubmit,
    children,
    footer
  }: {
    title: string;
    subtitle?: string;
    error?: string | null;
    loading?: boolean;
    submitLabel: string;
    loadingLabel: string;
    onsubmit: (event: SubmitEvent) => void;
    children: Snippet;
    footer?: Snippet;
  } = $props();
</script>

<div class="mx-auto w-full max-w-sm min-h-[80vh] flex flex-col justify-center">
  <div class="mb-6 flex justify-center">
    <Logo size="lg" />
  </div>

  <div class="rounded-xl border border-hairline bg-surface p-7">
    <h1 class="font-display text-xl font-semibold tracking-tight text-ink">{title}</h1>
    {#if subtitle}
      <p class="mt-1.5 text-sm text-mute">{subtitle}</p>
    {/if}

    <form {onsubmit} class="mt-6 flex flex-col gap-4" novalidate>
      {@render children()}

      {#if error}
        <p
          class="rounded-md border border-accent-red/25 bg-accent-red/10 px-3 py-2 text-[13px] text-accent-red"
          role="alert"
        >
          {error}
        </p>
      {/if}

      <Button type="submit" variant="primary" size="lg" full {loading}>
        {loading ? loadingLabel : submitLabel}
      </Button>
    </form>
  </div>

  {#if footer}
    <p class="mt-5 text-center text-sm text-mute">
      {@render footer()}
    </p>
  {/if}
</div>
