<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { SearchInput, ThemeToggle } from '$lib/components/molecules/index.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		title: string;
		subtitle?: string;
		eyebrow?: string;
		search?: string;
		showSearch?: boolean;
		searchPlaceholder?: string;
		themeLabels?: {
			light: string;
			dark: string;
			system: string;
			group?: string;
		};
		onsearch?: (value: string) => void;
		class?: string;
		heading?: import('svelte').Snippet;
		actions?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		title,
		subtitle,
		eyebrow,
		search = $bindable(''),
		showSearch = true,
		searchPlaceholder = 'Cari…',
		themeLabels,
		onsearch,
		class: className,
		heading,
		actions,
		...rest
	}: Props = $props();

</script>

<header
	bind:this={ref}
	class={cn(
		'sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-hairline bg-card/95 px-4 backdrop-blur-sm sm:gap-4 sm:px-6 lg:px-8',
		className
	)}
	{...rest}
>
	<div class="flex min-w-0 items-center gap-3">
		<div class="min-w-0">
			{#if eyebrow}
				<p class="ds-caption text-mute">{eyebrow}</p>
			{/if}
			{#if heading}
				{@render heading()}
			{:else}
				<h2 class="ds-section-title text-ink">{title}</h2>
			{/if}
			{#if subtitle}
				<p class="ds-caption text-mute">{subtitle}</p>
			{/if}
		</div>
	</div>

	<div class="flex shrink-0 items-center gap-3">
		{#if showSearch}
			<SearchInput
				bind:value={search}
				placeholder={searchPlaceholder}
				class="hidden w-52 md:flex lg:w-64"
				{onsearch}
			/>
		{/if}

		{@render actions?.()}

		<ThemeToggle size="sm" labels={themeLabels} />
	</div>
</header>
