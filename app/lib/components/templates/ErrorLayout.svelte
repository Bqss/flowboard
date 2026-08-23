<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';
	import { Button, Link, Logo } from '../atoms/index.js';
	import type { ErrorLayoutAction } from './shared.js';
	import { shellRootClass } from './shared.js';

	type Props = {
		code?: string | number;
		title: string;
		description?: string;
		primaryAction?: ErrorLayoutAction;
		secondaryAction?: ErrorLayoutAction;
		showLogo?: boolean;
		embedded?: boolean;
		class?: string;
		illustration?: Snippet;
	};

	let {
		code = 404,
		title,
		description,
		primaryAction,
		secondaryAction,
		showLogo = true,
		embedded = false,
		class: className,
		illustration
	}: Props = $props();
</script>

<div
	class={cn(
		'flex flex-col items-center justify-center bg-canvas px-4 py-10 text-center text-ink',
		shellRootClass(embedded),
		className
	)}
>
	{#if showLogo}
		<Logo size={40} class="mb-8" />
	{/if}

	{#if illustration}
		<div class="mb-6">{@render illustration()}</div>
	{:else}
		<p class="ds-stat mb-2 text-primary tabular-nums" aria-hidden="true">{code}</p>
	{/if}

	<h1 class="ds-page-title text-ink">{title}</h1>

	{#if description}
		<p class="ds-body mx-auto mt-3 max-w-md text-mute">{description}</p>
	{/if}

	<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
		{#if primaryAction}
			{#if primaryAction.href}
				<Button variant={primaryAction.variant ?? 'primary'} href={primaryAction.href}>
					{primaryAction.label}
				</Button>
			{:else}
				<Button variant={primaryAction.variant ?? 'primary'} onclick={primaryAction.onclick}>
					{primaryAction.label}
				</Button>
			{/if}
		{/if}

		{#if secondaryAction}
			{#if secondaryAction.href}
				<Link href={secondaryAction.href} subtle>{secondaryAction.label}</Link>
			{:else}
				<Button variant="secondary" onclick={secondaryAction.onclick}>{secondaryAction.label}</Button>
			{/if}
		{/if}
	</div>
</div>
