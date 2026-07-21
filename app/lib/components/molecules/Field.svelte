<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import Input from '../atoms/Input.svelte';

  /**
   * Labelled input row: label + optional hint keycap slot + Input + error line.
   * The label/input pair is the atomic form unit reused across auth forms.
   */
  let {
    label,
    type = 'text',
    value = $bindable(''),
    error = null,
    hint = null,
    ...rest
  }: {
    label: string;
    type?: HTMLInputAttributes['type'];
    value?: string;
    error?: string | null;
    hint?: string | null;
    [key: string]: unknown;
  } = $props();
</script>

<label class="flex flex-col gap-1.5">
  <span class="flex items-center justify-between text-[13px] font-medium text-charcoal">
    {label}
    {#if hint}<span class="text-[12px] font-normal text-ash">{hint}</span>{/if}
  </span>
  <Input {type} bind:value invalid={!!error} {...rest} />
  {#if error}
    <span class="text-[12px] text-accent-red" role="alert">{error}</span>
  {/if}
</label>
