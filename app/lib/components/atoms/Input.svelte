<script lang="ts">
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type InputType = Exclude<HTMLInputTypeAttribute, 'file'>;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, 'type' | 'size'> &
			({ type: 'file'; files?: FileList } | { type?: InputType; files?: undefined })
	> & {
		invalid?: boolean;
		size?: 'sm' | 'md';
	};

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		invalid = false,
		size = 'md',
		class: className,
		...rest
	}: Props = $props();
</script>

{#if type === 'file'}
	<input
		bind:this={ref}
		type="file"
		bind:files
		bind:value
		class={cn(
			'block w-full cursor-pointer rounded-full border border-hairline bg-card text-[13px] text-mute file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-on-primary hover:file:bg-primary-hover focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus)] disabled:cursor-not-allowed disabled:bg-canvas-sunken',
			className
		)}
		{...rest}
	/>
{:else}
	<input
		bind:this={ref}
		{type}
		bind:value
		aria-invalid={invalid || undefined}
		class={cn(
			'ds-body block w-full min-w-0 rounded-full border bg-card px-4 text-ink transition-colors duration-150 placeholder:text-mute focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:bg-canvas-sunken disabled:text-mute',
			invalid
				? 'border-status-urgent focus-visible:border-status-urgent focus-visible:ring-status-urgent/15'
				: 'border-hairline hover:border-hairline-strong focus-visible:border-primary',
			size === 'sm' ? 'h-9 px-3 text-[13px]' : 'h-10',
			className
		)}
		{...rest}
	/>
{/if}
