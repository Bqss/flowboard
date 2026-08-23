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
		onselect?: (index: number) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		steps,
		current = $bindable(0),
		orientation = 'horizontal',
		clickable = false,
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
	class={cn('w-full', className)}
	{...rest}
>
	<ol class={cn('flex', orientation === 'horizontal' ? 'items-start' : 'flex-col gap-1')}>
		{#each steps as step, i (step.label)}
			{@const done = i < current}
			{@const active = i === current}
			<li
				class={cn(
					'flex min-w-0',
					orientation === 'horizontal' ? 'flex-1 items-start gap-3' : 'gap-3'
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
							'ds-caption grid size-7 shrink-0 place-items-center rounded-full border transition-colors duration-150 ease-out',
							done && 'border-primary bg-primary text-on-primary',
							active && 'border-primary bg-primary-soft text-primary font-semibold',
							!done && !active && 'border-hairline bg-card text-faint',
							clickable && done && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]'
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
							'truncate text-[13px] leading-tight',
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
					<span class={cn('mt-3.5 h-px min-w-6 flex-1', done ? 'bg-primary' : 'bg-hairline')}></span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
