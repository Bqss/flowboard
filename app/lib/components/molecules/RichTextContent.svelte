<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { sanitizeRichText } from '$lib/rich-text.js';

  type Props = {
    value?: string | null;
    emptyLabel?: string;
    class?: string;
  };

  let {
    value = null,
    emptyLabel = 'Belum ada deskripsi.',
    class: className
  }: Props = $props();

  const html = $derived(sanitizeRichText(value));
  const hasContent = $derived(
    Boolean(value?.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim() || value?.match(/<img\b/i))
  );
</script>

<div class={cn('rich-text-content text-sm leading-7 text-ink-soft', className)}>
  {#if hasContent}
    {@html html}
  {:else}
    <p class="text-mute">{emptyLabel}</p>
  {/if}
</div>

<style>
  :global(.rich-text-content > * + *) {
    margin-top: 0.75rem;
  }

  :global(.rich-text-content h1),
  :global(.rich-text-content h2),
  :global(.rich-text-content h3),
  :global(.rich-text-content h4),
  :global(.rich-text-content h5),
  :global(.rich-text-content h6) {
    color: var(--color-ink);
    font-weight: 700;
    line-height: 1.25;
  }

  :global(.rich-text-content h1) {
    font-size: 1.5rem;
  }

  :global(.rich-text-content h2) {
    font-size: 1.125rem;
  }

  :global(.rich-text-content h3) {
    font-size: 1rem;
  }

  :global(.rich-text-content h4) {
    font-size: 0.9375rem;
  }

  :global(.rich-text-content h5) {
    font-size: 0.875rem;
  }

  :global(.rich-text-content h6) {
    font-size: 0.8125rem;
  }

  :global(.rich-text-content ul),
  :global(.rich-text-content ol) {
    padding-left: 1.5rem;
  }

  :global(.rich-text-content ul) {
    list-style: disc;
  }

  :global(.rich-text-content ol) {
    list-style: decimal;
  }

  :global(.rich-text-content li + li) {
    margin-top: 0.25rem;
  }

  :global(.rich-text-content a) {
    color: var(--color-primary-ink);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  :global(.rich-text-content pre),
  :global(.rich-text-content code) {
    border-radius: 0.5rem;
    background: var(--color-canvas-sunken);
    font-family: monospace;
  }

  :global(.rich-text-content code) {
    padding: 0.125rem 0.35rem;
    font-size: 0.875em;
  }

  :global(.rich-text-content pre) {
    overflow-x: auto;
    padding: 0.75rem 1rem;
    white-space: pre-wrap;
  }

  :global(.rich-text-content pre code) {
    padding: 0;
    background: transparent;
  }

  :global(.rich-text-content blockquote) {
    border-left: 2px solid var(--color-primary-border);
    padding-left: 1rem;
    color: var(--color-body);
  }

  :global(.rich-text-content img) {
    display: block;
    max-width: min(100%, 40rem);
    max-height: 28rem;
    object-fit: contain;
    height: auto;
    border-radius: 0.75rem;
    border: 1px solid var(--color-hairline);
    background: var(--color-canvas-sunken);
  }
</style>
