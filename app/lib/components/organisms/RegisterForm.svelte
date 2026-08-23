<script lang="ts">
	import type { HTMLFormAttributes } from 'svelte/elements';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { getEmailFieldError, normalizeEmail } from '$lib/email.js';
	import {
		assessPassword,
		getConfirmPasswordError,
		getPasswordFieldError
	} from '$lib/password.js';
	import { Button, Logo, ProgressBar } from '$lib/components/atoms/index.js';
	import { FormField, PasswordInput } from '$lib/components/molecules/index.js';
	import { Input as AtomInput } from '$lib/components/atoms/index.js';
	import { cardShellClass } from './shared.js';

	type Props = WithElementRef<Omit<HTMLFormAttributes, 'onsubmit'>, HTMLFormElement> & {
		name?: string;
		email?: string;
		password?: string;
		confirmPassword?: string;
		loading?: boolean;
		error?: string;
		title?: string;
		subtitle?: string;
		submitLabel?: string;
		onSubmit?: (payload: { name: string; email: string; password: string }) => void;
		class?: string;
		footer?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		name = $bindable(''),
		email = $bindable(''),
		password = $bindable(''),
		confirmPassword = $bindable(''),
		loading = false,
		error,
		title = 'Buat akun Flowboard',
		subtitle = 'Workspace otomatis dibuat — siap invite tim dalam hitungan menit.',
		submitLabel = 'Buat akun',
		onSubmit,
		class: className,
		footer,
		...rest
	}: Props = $props();

	const emailError = $derived(getEmailFieldError(email));
	const passwordStrength = $derived(assessPassword(password));
	const passwordError = $derived(getPasswordFieldError(password));
	const confirmPasswordError = $derived(getConfirmPasswordError(password, confirmPassword));

	const strengthLabelClass = $derived(
		({
			negative: 'text-status-urgent-ink',
			warning: 'text-status-progress-ink',
			queued: 'text-status-queued-ink',
			positive: 'text-status-done-ink'
		})[passwordStrength.tone]
	);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (emailError || passwordError || confirmPasswordError || !passwordStrength.valid) return;
		onSubmit?.({ name, email: normalizeEmail(email), password });
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
		<FormField label="Nama" required>
			{#snippet control(args)}
				<AtomInput {...args} bind:value={name} placeholder="Nama lengkap" autocomplete="name" />
			{/snippet}
		</FormField>

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

		<FormField label="Kata sandi" required error={passwordError ?? undefined}>
			{#snippet control(args)}
				<PasswordInput
					{...args}
					bind:value={password}
					placeholder="••••••••"
					autocomplete="new-password"
					invalid={Boolean(passwordError || error)}
				/>
			{/snippet}
		</FormField>

		{#if password.length > 0}
			<div class="space-y-2.5 rounded-lg border border-hairline bg-canvas-sunken px-3 py-3" aria-live="polite">
				<div class="flex items-center justify-between gap-2">
					<span class="ds-caption text-mute">Kekuatan kata sandi</span>
					{#if passwordStrength.label}
						<span class={cn('ds-caption font-semibold', strengthLabelClass)}>{passwordStrength.label}</span>
					{/if}
				</div>
				<ProgressBar value={passwordStrength.score} max={passwordStrength.maxScore} tone={passwordStrength.tone} size="sm" />
				<ul class="space-y-1.5">
					{#each passwordStrength.checks as check (check.id)}
						<li
							class={cn(
								'flex items-center gap-2 ds-caption',
								check.met ? 'text-status-done-ink' : 'text-mute'
							)}
						>
							<span
								class={cn(
									'inline-flex size-4 shrink-0 items-center justify-center rounded-full',
									check.met ? 'bg-status-done-soft text-status-done-ink' : 'bg-lane text-faint'
								)}
								aria-hidden="true"
							>
								{#if check.met}
									<CheckIcon class="size-2.5" strokeWidth={3} />
								{/if}
							</span>
							{check.label}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<FormField label="Konfirmasi kata sandi" required error={confirmPasswordError ?? undefined}>
			{#snippet control(args)}
				<PasswordInput
					{...args}
					bind:value={confirmPassword}
					placeholder="••••••••"
					autocomplete="new-password"
					invalid={Boolean(confirmPasswordError)}
				/>
			{/snippet}
		</FormField>

		{#if error}
			<p class="ds-caption text-status-urgent">{error}</p>
		{/if}

		<Button type="submit" variant="primary" class="w-full" {loading}>{submitLabel}</Button>
	</div>

	{#if footer}
		<div class="mt-6 border-t border-hairline pt-4 text-center ds-body text-mute">{@render footer()}</div>
	{/if}
</form>
