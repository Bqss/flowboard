<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';

	type Props = WithElementRef<Omit<HTMLInputAttributes, 'size' | 'type'>, HTMLInputElement> & {
		value?: string;
		invalid?: boolean;
		size?: 'sm' | 'md';
		/** Shows a 4-step sage strength meter under the field. */
		strength?: boolean;
		class?: string;
	};

	let {
		ref = $bindable(null),
		value = $bindable(''),
		invalid = false,
		size = 'md',
		strength = false,
		class: className,
		...rest
	}: Props = $props();

	let visible = $state(false);

	const score = $derived.by(() => {
		if (!value) return 0;
		let s = 0;
		if (value.length >= 8) s++;
		if (/[A-Z]/.test(value) && /[a-z]/.test(value)) s++;
		if (/\d/.test(value)) s++;
		if (/[^A-Za-z0-9]/.test(value)) s++;
		return s;
	});

	const strengthLabel = $derived(['Terlalu lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'][score]);
</script>

<div class={cn('w-full', className)}>
	<div class="relative flex items-center">
		<input
			bind:this={ref}
			bind:value
			type={visible ? 'text' : 'password'}
			aria-invalid={invalid || undefined}
			class={cn(
				'ds-body block w-full min-w-0 rounded-full border bg-card pr-10 text-ink transition-colors duration-150 placeholder:text-mute focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:bg-canvas-sunken disabled:text-mute',
				size === 'sm' ? 'h-9 px-3 text-[13px]' : 'h-10 px-4',
				invalid
					? 'border-status-urgent focus-visible:border-status-urgent focus-visible:ring-status-urgent/15'
					: 'border-hairline hover:border-hairline-strong focus-visible:border-primary'
			)}
			{...rest}
		/>
		<button
			type="button"
			onclick={() => (visible = !visible)}
			aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
			aria-pressed={visible}
			class="absolute right-1.5 grid size-7 place-items-center rounded-full text-mute transition-colors hover:bg-primary-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
		>
			{#if visible}
				<EyeOffIcon class="size-4" />
			{:else}
				<EyeIcon class="size-4" />
			{/if}
		</button>
	</div>

	{#if strength}
		<div class="mt-2 flex items-center gap-2">
			<div class="flex flex-1 gap-1" aria-hidden="true">
				{#each [1, 2, 3, 4] as step (step)}
					<span
						class={cn(
							'h-1 flex-1 rounded-full transition-colors duration-200',
							score >= step
								? score <= 1
									? 'bg-status-urgent'
									: score === 2
										? 'bg-status-progress'
										: 'bg-primary'
								: 'bg-lane'
						)}
					></span>
				{/each}
			</div>
			<span class="ds-caption shrink-0 text-mute">{strengthLabel}</span>
		</div>
	{/if}
</div>
