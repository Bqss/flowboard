<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Button } from '$lib/components/atoms/index.js';
	import type { PricingPlan } from './shared.js';
	import { cardShellClass } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		title?: string;
		plans: PricingPlan[];
		onselect?: (plan: PricingPlan) => void;
		class?: string;
	};

	let {
		ref = $bindable(null),
		title = 'Paket layanan',
		plans,
		onselect,
		class: className,
		...rest
	}: Props = $props();
</script>

<section bind:this={ref} class={cn('space-y-8', className)} {...rest}>
	<h2 class="ds-page-title text-center text-ink">{title}</h2>

	<div class="grid gap-4 lg:grid-cols-3">
		{#each plans as plan (plan.name)}
			<article
				class={cn(
					cardShellClass,
					'flex flex-col p-6',
					plan.highlighted && 'ring-2 ring-primary'
				)}
			>
				<h3 class="ds-section-title text-ink">{plan.name}</h3>
				{#if plan.description}
					<p class="ds-body mt-1 text-mute">{plan.description}</p>
				{/if}
				<p class="ds-stat mt-5 text-ink">
					{plan.price}
					{#if plan.period}
						<span class="ds-label text-mute">/{plan.period}</span>
					{/if}
				</p>

				<ul class="mt-5 flex-1 space-y-2">
					{#each plan.features as feature (feature)}
						<li class="ds-body text-mute">• {feature}</li>
					{/each}
				</ul>

				<Button
					variant={plan.highlighted ? 'primary' : 'secondary'}
					class="mt-6 w-full"
					onclick={() => onselect?.(plan)}
				>
					{plan.cta ?? 'Pilih paket'}
				</Button>
			</article>
		{/each}
	</div>
</section>
