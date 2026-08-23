<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';
	import { Logo } from '../atoms/index.js';
	import { Stepper } from '../molecules/index.js';
	import type { StepItem } from '../molecules/shared.js';
	import { cardSurfaceClass, shellRootClass, wizardWidthClass } from './shared.js';

	type Props = {
		steps: StepItem[];
		current?: number;
		title?: string;
		description?: string;
		maxWidth?: 'sm' | 'md' | 'lg';
		clickable?: boolean;
		onstep?: (index: number) => void;
		embedded?: boolean;
		class?: string;
		footer?: Snippet<[number]>;
		children: Snippet<[number]>;
	};

	let {
		steps,
		current = $bindable(0),
		title,
		description,
		maxWidth = 'md',
		clickable = false,
		onstep,
		embedded = false,
		class: className,
		footer,
		children
	}: Props = $props();
</script>

<div
	class={cn(
		'relative bg-canvas px-4 py-8 text-ink sm:px-6',
		shellRootClass(embedded),
		className
	)}
>
	<div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
		<div
			class="absolute top-0 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-primary-soft/50 blur-[100px]"
		></div>
	</div>

	<div class={cn('relative z-10 mx-auto w-full', wizardWidthClass[maxWidth])}>
		<div class="mb-8 flex flex-col items-center text-center">
			<Logo size={40} />
			{#if title}
				<h1 class="ds-page-title mt-4 text-ink">{title}</h1>
			{/if}
			{#if description}
				<p class="ds-body mt-1 max-w-md text-mute">{description}</p>
			{/if}
		</div>

		<Stepper {steps} bind:current {clickable} onselect={onstep} class="mb-8" />

		<div class={cn(cardSurfaceClass, 'p-6 sm:p-8')}>
			{@render children(current)}
		</div>

		{#if footer}
			<div class="mt-6 flex justify-end gap-2">
				{@render footer(current)}
			</div>
		{/if}
	</div>
</div>
