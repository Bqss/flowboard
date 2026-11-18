<script lang="ts">
	import { cn } from '$lib/utils.js';

	type Props = {
		/** Locale code: `en` (UK), `ms` (Malaysia), `id` (Indonesia). */
		code: string;
		class?: string;
	};

	let { code, class: className }: Props = $props();

	const NAMES: Record<string, string> = { en: 'United Kingdom', ms: 'Malaysia', id: 'Indonesia' };

	// Inline SVG rather than emoji flags: emoji glyphs are banned in the app UI (see DESIGN.md).
	const MALAYSIA_STAR = '9.6,2.35 9.95,3.27 10.93,3.32 10.17,3.94 10.42,4.88 9.6,4.35 8.78,4.88 9.03,3.94 8.27,3.32 9.25,3.27';
</script>

<span
	role="img"
	aria-label={NAMES[code] ?? code}
	class={cn('inline-flex shrink-0 overflow-hidden rounded-[3px] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.12)]', className)}
>
	{#if code === 'en'}
		<svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" class="size-full" aria-hidden="true">
			<defs>
				<clipPath id="flag-uk-s"><path d="M0,0 v30 h60 v-30 z" /></clipPath>
				<clipPath id="flag-uk-t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
			</defs>
			<rect width="60" height="30" fill="#012169" />
			<g clip-path="url(#flag-uk-s)">
				<path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6" />
				<path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#flag-uk-t)" stroke="#C8102E" stroke-width="4" />
			</g>
			<path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10" />
			<path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6" />
		</svg>
	{:else if code === 'ms'}
		<svg viewBox="0 0 28 14" preserveAspectRatio="xMidYMid slice" class="size-full" aria-hidden="true">
			<rect width="28" height="14" fill="#fff" />
			{#each [0, 2, 4, 6, 8, 10, 12] as y (y)}
				<rect y={y} width="28" height="1" fill="#cc0001" />
			{/each}
			<rect width="14" height="7.5" fill="#010066" />
			<circle cx="6" cy="3.75" r="2.5" fill="#ffcc00" />
			<circle cx="6.7" cy="3.75" r="2.1" fill="#010066" />
			<polygon points={MALAYSIA_STAR} fill="#ffcc00" />
		</svg>
	{:else if code === 'id'}
		<svg viewBox="0 0 28 14" preserveAspectRatio="xMidYMid slice" class="size-full" aria-hidden="true">
			<rect width="28" height="7" fill="#ce1126" />
			<rect y="7" width="28" height="7" fill="#fff" />
		</svg>
	{/if}
</span>
