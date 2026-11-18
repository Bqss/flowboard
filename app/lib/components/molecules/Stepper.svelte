<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { StepItem } from './shared.js';
	import CheckIcon from '@lucide/svelte/icons/check';

	type Props = WithElementRef<Omit<HTMLAttributes<HTMLElement>, 'onselect'>> & {
		steps: StepItem[];
		/** Zero-based index of the active step. */
		current?: number;
		orientation?: 'horizontal' | 'vertical';
		/** Allows jumping back to a completed step. */
		clickable?: boolean;
		/** Compact card treatment for page-level flows. */
		variant?: 'default' | 'compact';
		onselect?: (index: number) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		steps,
		current = $bindable(0),
		orientation = 'horizontal',
		clickable = false,
		variant = 'default',
		onselect,
		class: className,
		...rest
	}: Props = $props();

	function go(index: number) {
		if (!clickable || index > current) return;
		current = index;
		onselect?.(index);
	}
</script>

<nav
	bind:this={ref}
	aria-label="Langkah"
	class={cn(
		'w-full',
		variant === 'compact' && 'rounded-card border border-hairline bg-card p-3 shadow-card sm:p-4',
		className
	)}
	{...rest}
>
	<ol
		class={cn(
			'flex',
			orientation === 'horizontal'
				? variant === 'compact'
					? 'items-center gap-2 sm:gap-3'
					: 'items-start'
				: 'flex-col gap-1'
		)}
	>
		{#each steps as step, i (step.label)}
			{@const done = i < current}
			{@const active = i === current}
			<li
				class={cn(
					'flex min-w-0',
					orientation === 'horizontal'
						? variant === 'compact'
							? 'flex-1 items-center gap-2'
							: 'flex-1 items-start gap-3'
						: 'gap-3'
				)}
			>
				<div class={cn('flex shrink-0', orientation === 'vertical' && 'flex-col items-center')}>
					<svelte:element
						this={clickable && done ? 'button' : 'div'}
						role={clickable && done ? 'button' : undefined}
						tabindex={clickable && done ? 0 : undefined}
						onclick={() => go(i)}
						onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && go(i)}
						aria-current={active ? 'step' : undefined}
						class={cn(
							variant === 'compact'
								? 'grid size-8 shrink-0 place-items-center rounded-full border text-xs transition-colors duration-150 ease-out'
								: 'ds-caption grid size-7 shrink-0 place-items-center rounded-full border transition-colors duration-150 ease-out',
							done &&
								(variant === 'compact'
									? 'border-primary bg-primary-soft text-primary'
									: 'border-primary bg-primary text-on-primary'),
							active &&
								(variant === 'compact'
									? 'border-primary bg-primary text-on-primary font-semibold'
									: 'border-primary bg-primary-soft text-primary font-semibold'),
							!done &&
								!active &&
								(variant === 'compact'
									? 'border-hairline bg-canvas-sunken text-mute'
									: 'border-hairline bg-card text-faint'),
							clickable &&
								done &&
								'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]'
						)}
					>
						{#if done}
							<CheckIcon class="size-3.5" />
						{:else}
							{i + 1}
						{/if}
					</svelte:element>

					{#if orientation === 'vertical' && i < steps.length - 1}
						<span class={cn('my-1 w-px flex-1 self-center', done ? 'bg-primary' : 'bg-hairline')}></span>
					{/if}
				</div>

				<div class={cn('min-w-0', orientation === 'vertical' && 'pb-5')}>
					<p
						class={cn(
							'text-meta leading-tight',
							orientation === 'vertical' && 'truncate',
							active ? 'font-semibold text-ink' : done ? 'text-ink' : 'text-mute'
						)}
					>
						{step.label}
					</p>
					{#if step.description}
						<p class="ds-caption mt-0.5 text-mute">{step.description}</p>
					{/if}
				</div>

				{#if orientation === 'horizontal' && i < steps.length - 1}
					<span
						class={cn(
							variant === 'compact'
								? 'mt-4 h-px min-w-4 flex-1'
								: 'mt-3.5 h-px min-w-6 flex-1',
							done ? 'bg-primary' : 'bg-hairline'
						)}
					></span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
