<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const buttonVariants = tv({
		base: 'ds-button-text inline-flex shrink-0 items-center justify-center gap-2 transition-all duration-150 ease-out select-none whitespace-nowrap outline-none [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50',
		variants: {
			variant: {
				primary:
					'rounded-full bg-primary text-on-primary shadow-primary hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2',
				secondary:
					'rounded-full border border-hairline bg-card text-ink-soft hover:border-hairline-strong hover:bg-canvas-sunken focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:ring-offset-2',
				tertiary:
					'rounded-full bg-lane text-ink-soft hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:ring-offset-2',
				ghost:
					'rounded-md text-mute hover:bg-lane hover:text-ink-soft focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:ring-offset-2',
				destructive:
					'rounded-full bg-status-urgent text-on-primary hover:bg-status-urgent-strong focus-visible:ring-2 focus-visible:ring-status-urgent/25 focus-visible:ring-offset-2',
				danger:
					'rounded-full bg-status-urgent text-on-primary hover:bg-status-urgent-strong focus-visible:ring-2 focus-visible:ring-status-urgent/25 focus-visible:ring-offset-2',
				success:
					'rounded-full bg-status-done text-status-done-ink hover:bg-status-done-strong focus-visible:ring-2 focus-visible:ring-status-done/25 focus-visible:ring-offset-2',
				warning:
					'rounded-full bg-status-progress text-status-progress-ink hover:bg-status-progress-strong focus-visible:ring-2 focus-visible:ring-status-progress/25 focus-visible:ring-offset-2',
				info:
					'rounded-full bg-status-queued text-on-primary hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-status-queued/25 focus-visible:ring-offset-2',
				link: 'rounded-md text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:ring-offset-2',
				lane:
					'rounded-full border border-hairline/80 shadow-xs focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 transition-all font-semibold'
			},
			lane: {
				queued: 'bg-primary-soft text-primary-ink border-primary-border/60 hover:bg-primary-soft-hover',
				progress: 'bg-status-progress-soft text-status-progress-ink border-status-progress/40 hover:brightness-95',
				done: 'bg-status-done-soft text-status-done-ink border-status-done/40 hover:brightness-95',
				none: ''
			},
			size: {
				sm: 'h-9 px-4 text-[13px] [&_svg:not([class*=size-])]:size-4',
				md: 'h-10 px-5 [&_svg:not([class*=size-])]:size-[18px]',
				lg: 'h-11 px-5 text-[14px] [&_svg:not([class*=size-])]:size-5',
				lane: 'h-11 w-full px-5 [&_svg:not([class*=size-])]:size-[18px]',
				icon: 'size-10 p-0 [&_svg:not([class*=size-])]:size-[18px]'
			}
		},
		defaultVariants: { variant: 'primary', size: 'md', lane: 'none' }
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];
	export type ButtonLane = VariantProps<typeof buttonVariants>['lane'];
</script>

<script lang="ts">
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
			lane?: ButtonLane;
			href?: string;
			loading?: boolean;
			children?: import('svelte').Snippet;
		};

	let {
		class: className,
		variant = 'primary',
		size = 'md',
		lane = 'none',
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		loading = false,
		disabled,
		children,
		...rest
	}: Props = $props();
</script>

{#if href}
	<a
		bind:this={ref}
		class={cn(buttonVariants({ variant, size, lane: variant === 'lane' ? lane : 'none' }), className)}
		{href}
		aria-disabled={disabled || loading || undefined}
		role={disabled || loading ? 'link' : undefined}
		tabindex={disabled || loading ? -1 : undefined}
		{...rest}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		class={cn(
			buttonVariants({ variant, size, lane: variant === 'lane' ? lane : 'none' }),
			loading && 'cursor-wait',
			className
		)}
		{type}
		disabled={disabled || loading}
		{...rest}
	>
		{#if loading}
			<svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
				<path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
			</svg>
		{/if}
		{@render children?.()}
	</button>
{/if}
