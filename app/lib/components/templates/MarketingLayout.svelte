<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils.js';
	import { Logo, Button } from '../atoms/index.js';
	import { AppFooter } from '../organisms/index.js';
	import type { FooterLink } from '../organisms/shared.js';
	import type { MarketingNavLink } from './shared.js';
	import { shellRootClass } from './shared.js';

	type Props = {
		nav?: MarketingNavLink[];
		footerLinks?: FooterLink[];
		footerNote?: string;
		ctaLabel?: string;
		ctaHref?: string;
		embedded?: boolean;
		class?: string;
		children: Snippet;
	};

	let {
		nav = [],
		footerLinks = [],
		footerNote,
		ctaLabel = 'Masuk',
		ctaHref = '/login',
		embedded = false,
		class: className,
		children
	}: Props = $props();
</script>

<div class={cn('bg-canvas text-ink', shellRootClass(embedded), className)}>
	<header class="sticky top-0 z-30 bg-surface-rail/90 backdrop-blur-sm">
		<div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
			<a href="/" aria-label="DripDesk home">
				<Logo size={36} />
			</a>

			{#if nav.length}
				<nav class="hidden items-center gap-6 md:flex" aria-label="Marketing">
					{#each nav as item, i (`${item.label}-${i}`)}
						<a
							href={item.href}
							class={cn(
								'ds-nav transition-colors',
								item.active ? 'font-semibold text-ink' : 'text-mute hover:text-ink'
							)}
						>
							{item.label}
						</a>
					{/each}
				</nav>
			{/if}

			<Button variant="primary" size="sm" href={ctaHref}>{ctaLabel}</Button>
		</div>
	</header>

	<main>{@render children()}</main>

	<AppFooter links={footerLinks} note={footerNote} />
</div>
