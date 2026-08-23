<script lang="ts" module>
	export type Language = { code: string; label: string; short?: string };
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { dismissable, panelClass, panelItemClass } from './shared.js';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import CheckIcon from '@lucide/svelte/icons/check';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		value?: string;
		languages?: Language[];
		/** `compact` shows the code only — fits the 76px rail and topbar. */
		variant?: 'compact' | 'labelled';
		align?: 'start' | 'end';
		onchange?: (code: string) => void;
		class?: string;
	};

	const DEFAULT_LANGUAGES: Language[] = [
		{ code: 'id', label: 'Bahasa Indonesia', short: 'ID' },
		{ code: 'en', label: 'English', short: 'EN' }
	];

	let {
		ref = $bindable(null),
		value = $bindable('id'),
		languages = DEFAULT_LANGUAGES,
		variant = 'compact',
		align = 'end',
		onchange,
		class: className,
		...rest
	}: Props = $props();

	let open = $state(false);

	const active = $derived(languages.find((l) => l.code === value) ?? languages[0]);

	function pick(code: string) {
		value = code;
		onchange?.(code);
		open = false;
	}
</script>

<div
	bind:this={ref}
	class={cn('relative inline-flex', className)}
	use:dismissable={() => (open = false)}
	{...rest}
>
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-label="Ganti bahasa"
		class={cn(
			'ds-button-text inline-flex items-center gap-2 rounded-md text-mute transition-colors duration-150 ease-out hover:bg-primary-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]',
			variant === 'compact' ? 'h-9 px-2.5' : 'h-10 border border-hairline bg-card px-3'
		)}
	>
		<GlobeIcon class="size-4" />
		<span>{variant === 'compact' ? (active?.short ?? active?.code.toUpperCase()) : active?.label}</span>
	</button>

	{#if open}
		<div
			role="listbox"
			aria-label="Bahasa"
			class={cn(
				panelClass,
				'absolute top-[calc(100%+6px)]',
				align === 'end' ? 'right-0' : 'left-0'
			)}
		>
			{#each languages as language (language.code)}
				<div
					role="option"
					tabindex="-1"
					aria-selected={language.code === value}
					onclick={() => pick(language.code)}
					onkeydown={(e) => e.key === 'Enter' && pick(language.code)}
					class={cn(
						panelItemClass,
						'justify-between whitespace-nowrap',
						language.code === value && 'font-medium'
					)}
				>
					<span class="inline-flex items-center gap-2.5">
						<span class="ds-caption ds-mono w-6 text-mute">
							{language.short ?? language.code.toUpperCase()}
						</span>
						{language.label}
					</span>
					{#if language.code === value}
						<CheckIcon class="size-4 shrink-0 text-primary" />
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
