<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Small inline label. `tone` picks a soft translucent accent wash; `plain`
   * is the neutral surface-elevated pill used for tier/plan indicators.
   */
  type Tone = 'plain' | 'blue' | 'red' | 'green' | 'yellow';

  let {
    tone = 'plain',
    dot = false,
    class: klass = '',
    children
  }: {
    tone?: Tone;
    dot?: boolean;
    class?: string;
    children: Snippet;
  } = $props();

  const tones: Record<Tone, string> = {
    plain: 'bg-elevated text-mute border-hairline',
    blue: 'bg-accent-blue/12 text-accent-blue border-accent-blue/25',
    red: 'bg-accent-red/12 text-accent-red border-accent-red/25',
    green: 'bg-accent-green/12 text-accent-green border-accent-green/25',
    yellow: 'bg-accent-yellow/12 text-accent-yellow border-accent-yellow/25'
  };

  const dots: Record<Tone, string> = {
    plain: 'bg-mute',
    blue: 'bg-accent-blue',
    red: 'bg-accent-red',
    green: 'bg-accent-green',
    yellow: 'bg-accent-yellow'
  };
</script>

<span
  class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] font-medium tracking-[0.02em] {tones[
    tone
  ]} {klass}"
>
  {#if dot}
    <span class="h-1.5 w-1.5 rounded-full {dots[tone]} shadow-[0_0_8px_currentColor]"></span>
  {/if}
  {@render children()}
</span>
