<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { mode, setMode, toggleMode, userPrefersMode } from 'mode-watcher';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import MonitorIcon from '@lucide/svelte/icons/monitor';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		/** `icon` = single circular button; `segmented` = light / dark / system well. */
		variant?: 'icon' | 'segmented';
		size?: 'sm' | 'md';
		labels?: {
			light: string;
			dark: string;
			system: string;
			group?: string;
		};
		class?: string;
	};

	let {
		ref = $bindable(null),
		variant = 'icon',
		size = 'md',
		labels = { light: 'Terang', dark: 'Gelap', system: 'Sistem', group: 'Tema tampilan' },
		class: className,
		...rest
	}: Props = $props();

	const options = [
		{ value: 'light', label: 'Terang', icon: SunIcon },
		{ value: 'dark', label: 'Gelap', icon: MoonIcon },
		{ value: 'system', label: 'Sistem', icon: MonitorIcon }
	] as const;

	const isDark = $derived(mode.current === 'dark');
</script>

{#if variant === 'icon'}
	<button
		bind:this={ref}
		type="button"
		onclick={toggleMode}
		aria-label={isDark ? labels.light : labels.dark}
		title={isDark ? labels.light : labels.dark}
		class={cn(
			'inline-grid shrink-0 place-items-center rounded-full bg-card text-ink shadow-[var(--shadow-card)] transition-colors duration-150 ease-out hover:bg-lane focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]',
			size === 'sm' ? 'size-8' : 'size-10',
			className
		)}
		{...rest}
	>
		{#if isDark}
			<MoonIcon class={size === 'sm' ? 'size-4' : 'size-5'} />
		{:else}
			<SunIcon class={size === 'sm' ? 'size-4' : 'size-5'} />
		{/if}
	</button>
{:else}
	<div
		bind:this={ref}
		role="radiogroup"
		aria-label={labels.group}
		class={cn('inline-flex w-fit items-center gap-1 rounded-md bg-lane p-1', className)}
		{...rest}
	>
		{#each options as option (option.value)}
			{@const active = userPrefersMode.current === option.value}
			<button
				type="button"
				role="radio"
				aria-checked={active}
				aria-label={option.label}
				title={option.label}
				onclick={() => setMode(option.value)}
				class={cn(
					'ds-button-text inline-flex items-center gap-1.5 rounded-md transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]',
					size === 'sm' ? 'h-7 px-2' : 'h-8 px-2.5',
					active ? 'bg-card text-ink shadow-[var(--shadow-card)]' : 'text-mute hover:text-ink'
				)}
			>
				<option.icon class="size-4" />
			</button>
		{/each}
	</div>
{/if}
