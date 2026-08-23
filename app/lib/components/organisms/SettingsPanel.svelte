<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { TabItem } from '$lib/components/molecules/shared.js';
	import { Tabs } from '$lib/components/molecules/index.js';
	import { cardShellClass } from './shared.js';

	type Props = WithElementRef<Omit<HTMLAttributes<HTMLDivElement>, 'onchange'>> & {
		sections: TabItem[];
		value?: string;
		title?: string;
		description?: string;
		onchange?: (value: string) => void;
		class?: string;
		content: import('svelte').Snippet<[string]>;
	};

	let {
		ref = $bindable(null),
		sections,
		value = $bindable(sections[0]?.value ?? ''),
		title = 'Pengaturan',
		description,
		onchange,
		class: className,
		content,
		...rest
	}: Props = $props();
</script>

<div bind:this={ref} class={cn('grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]', className)} {...rest}>
	<div>
		<h1 class="ds-page-title text-ink">{title}</h1>
		{#if description}
			<p class="ds-body mt-1 text-mute">{description}</p>
		{/if}
		<div class="mt-5 lg:hidden">
			<Tabs items={sections} bind:value {onchange} variant="segmented" full />
		</div>
		<nav class="mt-5 hidden lg:block" aria-label="Bagian pengaturan">
			<ul class="space-y-1">
				{#each sections as section (section.value)}
					<li>
						<button
							type="button"
							onclick={() => {
								value = section.value;
								onchange?.(section.value);
							}}
							class={cn(
								'ds-nav flex w-full items-center rounded-md px-3 py-2 text-left transition-colors',
								value === section.value
									? 'bg-primary-soft font-semibold text-primary'
									: 'text-mute hover:bg-primary-soft/50 hover:text-ink'
							)}
						>
							{section.label}
						</button>
					</li>
				{/each}
			</ul>
		</nav>
	</div>

	<div class={cn(cardShellClass, 'p-6')}>
		{@render content(value)}
	</div>
</div>
