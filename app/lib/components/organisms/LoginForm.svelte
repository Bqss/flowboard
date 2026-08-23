<script lang="ts">
	import type { HTMLFormAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { getEmailFieldError, normalizeEmail } from '$lib/email.js';
	import { Button, Checkbox, Logo } from '$lib/components/atoms/index.js';
	import { FormField, PasswordInput } from '$lib/components/molecules/index.js';
	import { Input as AtomInput } from '$lib/components/atoms/index.js';
	import { cardShellClass } from './shared.js';

	type Props = WithElementRef<Omit<HTMLFormAttributes, 'onsubmit'>, HTMLFormElement> & {
		email?: string;
		password?: string;
		remember?: boolean;
		loading?: boolean;
		error?: string;
		title?: string;
		subtitle?: string;
		submitLabel?: string;
		onSubmit?: (payload: { email: string; password: string; remember: boolean }) => void;
		class?: string;
		footer?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		email = $bindable(''),
		password = $bindable(''),
		remember = $bindable(false),
		loading = false,
		error,
		title = 'Masuk ke Flowboard',
		subtitle = 'Kelola onboarding pelanggan — tanpa pelanggan tercicir.',
		submitLabel = 'Masuk',
		onSubmit,
		class: className,
		footer,
		...rest
	}: Props = $props();

	const emailError = $derived(getEmailFieldError(email));

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (emailError) return;
		onSubmit?.({ email: normalizeEmail(email), password, remember });
	}
</script>

<form
	bind:this={ref}
	onsubmit={submit}
	class={cn(cardShellClass, 'mx-auto w-full max-w-md border border-hairline p-6 md:p-8', className)}
	{...rest}
>
	<div class="mb-6 flex flex-col items-center text-center">
		<Logo size={44} class="mb-3" />
		<h1 class="ds-page-title text-ink">{title}</h1>
		<p class="ds-body mt-1 text-mute">{subtitle}</p>
	</div>

	<div class="space-y-4">
		<FormField label="Email" required error={emailError ?? undefined}>
			{#snippet control(args)}
				<AtomInput
					{...args}
					type="email"
					bind:value={email}
					placeholder="nama@perusahaan.com"
					autocomplete="email"
					invalid={Boolean(emailError || error)}
				/>
			{/snippet}
		</FormField>

		<FormField label="Kata sandi" required>
			{#snippet control(args)}
				<PasswordInput {...args} bind:value={password} placeholder="••••••••" invalid={Boolean(error)} />
			{/snippet}
		</FormField>

		{#if error}
			<p class="ds-caption text-status-urgent">{error}</p>
		{/if}

		<label class="flex items-center gap-2.5">
			<Checkbox bind:checked={remember} />
			<span class="ds-body text-ink">Ingat saya di perangkat ini</span>
		</label>

		<Button type="submit" variant="primary" class="w-full" {loading}>{submitLabel}</Button>
	</div>

	{#if footer}
		<div class="mt-6 border-t border-hairline pt-4 text-center ds-body text-mute">{@render footer()}</div>
	{/if}
</form>
