<script lang="ts">
  import CommandRow from '../molecules/CommandRow.svelte';
  import Keycap from '../atoms/Keycap.svelte';

  /**
   * The hero command-palette mockup — the brand's load-bearing visual. A faux
   * macOS window (traffic-light dots, search row, command list, footer hint).
   * A tiny typing loop cycles the query and moves the active-row selection so
   * the mockup reads as alive without a real backend. Reduced-motion friendly:
   * the interval simply drives state; nothing layout-shifts abruptly.
   */
  import { onMount } from 'svelte';

  const queries = ['Deploy to production', 'Search users', 'Run migration', 'Open dashboard'];
  const rows = [
    { label: 'Deploy to production', accent: 'red', shortcut: '⌘ ⏎', letter: 'D' },
    { label: 'Search users', accent: 'blue', shortcut: '⌘ K', letter: 'U' },
    { label: 'Run migration', accent: 'green', shortcut: '⌘ M', letter: 'M' },
    { label: 'View API health', accent: 'yellow', shortcut: '⌘ H', letter: 'H' }
  ] as const;

  let active = $state(0);
  let typed = $state('');

  onMount(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let qi = 0;
    let ci = 0;
    let holding = 0;

    const id = setInterval(() => {
      const target = queries[qi];
      if (reduce) {
        typed = target;
        active = qi;
        qi = (qi + 1) % queries.length;
        return;
      }
      if (holding > 0) {
        holding--;
        if (holding === 0) {
          qi = (qi + 1) % queries.length;
          ci = 0;
          typed = '';
        }
        return;
      }
      if (ci <= target.length) {
        typed = target.slice(0, ci);
        active = qi;
        ci++;
      } else {
        holding = 14; // pause on the full query
      }
    }, 90);

    return () => clearInterval(id);
  });
</script>

<div
  class="w-full overflow-hidden rounded-xl border border-hairline bg-surface/95 backdrop-blur-xl
    shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]"
>
  <!-- window chrome -->
  <div class="flex items-center gap-2 border-b border-hairline px-4 py-3">
    <span class="h-3 w-3 rounded-full bg-[#ff5f57]"></span>
    <span class="h-3 w-3 rounded-full bg-[#febc2e]"></span>
    <span class="h-3 w-3 rounded-full bg-[#28c840]"></span>
    <span class="ml-3 text-[12px] text-ash">narko — command palette</span>
  </div>

  <!-- search row -->
  <div class="flex items-center gap-3 border-b border-hairline px-4 py-3.5">
    <svg class="h-4 w-4 text-ash" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.4" />
      <path d="m11 11 3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
    </svg>
    <span class="flex-1 text-sm text-ink">
      {typed}<span
        class="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-accent-red"
        style="animation: narko-blink 1s step-end infinite;"
      ></span>
    </span>
    <Keycap>esc</Keycap>
  </div>

  <!-- command rows -->
  <div class="flex flex-col gap-0.5 p-2">
    <div class="px-2.5 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wider text-ash">
      Commands
    </div>
    {#each rows as row, i (row.label)}
      <CommandRow
        label={row.label}
        accent={row.accent}
        shortcut={row.shortcut}
        active={i === active}
      >
        {#snippet glyph()}
          <span class="text-[11px] font-semibold">{row.letter}</span>
        {/snippet}
      </CommandRow>
    {/each}
  </div>

  <!-- footer hint -->
  <div class="flex items-center justify-between border-t border-hairline px-4 py-2.5 text-[12px] text-ash">
    <span class="flex items-center gap-1.5">
      <span class="h-4 w-4 rounded bg-gradient-to-br from-[#ff5757] to-[#a1131a]"></span>
      Narko
    </span>
    <span class="flex items-center gap-1.5">
      Actions <Keycap>⌘</Keycap><Keycap>K</Keycap>
    </span>
  </div>
</div>
