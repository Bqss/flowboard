<script lang="ts" module>
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { Tick02Icon } from '@hugeicons/core-free-icons';
	export type Language = { code: string; label: string; short?: string };
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { Select as SelectPrimitive } from 'bits-ui';
	import Portal from '$lib/components/atoms/Portal.svelte';
	import Flag from '$lib/components/atoms/Flag.svelte';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { panelClass, panelItemClass } from './shared.js';

	type Props = WithElementRef<Omit<HTMLAttributes<HTMLDivElement>, 'onchange'>> & {
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
	const bitsItems = $derived(languages.map((l) => ({ value: l.code, label: l.label })));
</script>

<div bind:this={ref} class={cn('relative inline-flex', className)} {...rest}>
	<SelectPrimitive.Root
		type="single"
		bind:value
		bind:open
		items={bitsItems}
		allowDeselect={false}
		onValueChange={(next) => onchange?.(next)}
	>
		<SelectPrimitive.Trigger
			aria-label="Ganti bahasa"
			class={cn(
				'ds-button-text inline-flex h-10 items-center gap-2 rounded-md border border-hairline bg-card px-2.5 text-ink-soft shadow-control transition-colors duration-150 ease-out hover:border-hairline-strong hover:bg-canvas-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]',
				variant === 'labelled' && 'px-3'
			)}
		>
			{#snippet children()}
				<Flag code={active?.code ?? 'id'} class="h-3.5 w-6" />
				<span>{variant === 'compact' ? (active?.short ?? active?.code.toUpperCase()) : active?.label}</span>
			{/snippet}
		</SelectPrimitive.Trigger>

		<Portal>
			<SelectPrimitive.Content
				sideOffset={6}
				align={align === 'end' ? 'end' : 'start'}
				aria-label="Bahasa"
				class={cn(panelClass, 'z-[400] min-w-[10rem] whitespace-nowrap')}
			>
				<SelectPrimitive.Viewport>
					{#each languages as language (language.code)}
						<SelectPrimitive.Item
							value={language.code}
							label={language.label}
							class={cn(
								panelItemClass,
								'justify-between whitespace-nowrap data-[highlighted]:bg-primary-soft',
								language.code === value && 'font-medium'
							)}
						>
							{#snippet children({ selected })}
								<span class="inline-flex items-center gap-2.5">
									<Flag code={language.code} class="h-3.5 w-6" />
									{language.label}
								</span>
								{#if selected}
									<HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} class="size-4 shrink-0 text-primary" />
								{/if}
							{/snippet}
						</SelectPrimitive.Item>
					{/each}
				</SelectPrimitive.Viewport>
			</SelectPrimitive.Content>
		</Portal>
	</SelectPrimitive.Root>
</div>
