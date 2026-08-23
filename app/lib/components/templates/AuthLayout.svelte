<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';
	import { Logo } from '../atoms/index.js';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import { authWidthClass, shellRootClass } from './shared.js';

	type Props = {
		footerNote?: string;
		maxWidth?: 'sm' | 'md';
		embedded?: boolean;
		class?: string;
		children: Snippet;
	};

	let {
		footerNote = 'Sistem operasional internal DripLab',
		maxWidth = 'sm',
		embedded = false,
		class: className,
		children
	}: Props = $props();
</script>

<div
	class={cn(
		'relative flex w-full flex-col items-center justify-center bg-canvas px-4 py-8 text-ink sm:px-6',
		shellRootClass(embedded),
		className
	)}
>
	<div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
		<div
			class="absolute top-1/2 left-1/2 size-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-soft/60 blur-[120px]"
		></div>
	</div>

	<div class={cn('relative z-10 flex w-full flex-col gap-5', authWidthClass[maxWidth])}>
		<div class="flex flex-col items-center text-center">
			<a href="/" class="mb-2 transition-opacity duration-150 hover:opacity-90" aria-label="DripDesk">
				<Logo size={44} />
			</a>
			<p class="ds-caption text-mute">DripDesk · Internal Desk</p>
		</div>

		{@render children()}

		<div class="flex items-center justify-center gap-1.5 pt-1 text-center">
			<ShieldCheckIcon class="size-3.5 shrink-0 text-primary" aria-hidden="true" />
			<span class="ds-caption text-mute">{footerNote}</span>
		</div>
	</div>
</div>
