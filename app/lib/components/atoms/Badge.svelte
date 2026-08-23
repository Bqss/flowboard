<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const badgeVariants = tv({
		base: 'ds-caption inline-flex w-fit shrink-0 items-center gap-1 px-2.5 py-1 transition-colors [&_svg]:pointer-events-none [&_svg]:size-3',
		variants: {
			tone: {
				neutral: 'rounded-sm border border-status-idle/25 bg-status-idle-soft text-status-idle-ink',
				queued: 'rounded-sm border border-status-queued/20 bg-status-queued-soft text-status-queued-ink',
				progress: 'rounded-sm border border-status-progress/25 bg-status-progress-soft text-status-progress-ink',
				done: 'rounded-sm border border-status-done/25 bg-status-done-soft text-status-done-ink',
				urgent: 'rounded-sm border border-status-urgent/25 bg-status-urgent-soft text-status-urgent-ink',
				idle: 'rounded-sm border border-status-idle/25 bg-status-idle-soft text-status-idle-ink',
				positive: 'rounded-sm border border-status-done/25 bg-status-done-soft text-status-done-ink',
				negative: 'rounded-sm border border-status-urgent/25 bg-status-urgent-soft text-status-urgent-ink',
				warning: 'rounded-sm border border-status-progress/25 bg-status-progress-soft text-status-progress-ink',
				info: 'rounded-sm border border-status-queued/20 bg-status-queued-soft text-status-queued-ink'
			},
			variant: {
				soft: '',
				solid: 'rounded-full text-on-primary',
				outline: 'rounded-sm border border-hairline bg-transparent'
			},
			solidTone: {
				none: '',
				queued: 'bg-status-queued',
				progress: 'bg-status-progress text-ink',
				done: 'bg-status-done text-ink',
				urgent: 'bg-status-urgent',
				idle: 'bg-status-idle text-ink'
			}
		},
		defaultVariants: { tone: 'neutral', variant: 'soft', solidTone: 'none' }
	});

	export type BadgeTone = VariantProps<typeof badgeVariants>['tone'];
	export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		tone?: BadgeTone;
		variant?: BadgeVariant;
		solid?: 'queued' | 'progress' | 'done' | 'urgent' | 'idle';
		children?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		tone = 'neutral',
		variant = 'soft',
		solid,
		class: className,
		children,
		...rest
	}: Props = $props();

	const solidTone = $derived(
		variant === 'solid' ? (solid ?? (tone === 'progress' || tone === 'done' || tone === 'idle' ? tone : tone === 'negative' ? 'urgent' : tone === 'positive' ? 'done' : tone === 'warning' ? 'progress' : 'queued')) : 'none'
	);
</script>

<span
	bind:this={ref}
	class={cn(badgeVariants({ tone, variant, solidTone }), className)}
	{...rest}
>
	{@render children?.()}
</span>
