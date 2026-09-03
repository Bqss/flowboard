<script lang="ts">
	import type { HTMLFormAttributes } from 'svelte/elements';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { isValidEmail, normalizeEmail } from '$lib/email.js';
	import { assessPassword, type PasswordCheckId } from '$lib/password.js';
	import { authCopy, type AuthRegisterCopy } from '$lib/i18n/auth.js';
	import { locale } from '$lib/i18n/index.js';
	import { Button, GoogleButton, ProgressBar } from '$lib/components/atoms/index.js';
	import { FormField, PasswordInput } from '$lib/components/molecules/index.js';
	import { Input as AtomInput } from '$lib/components/atoms/index.js';
	import { cardShellClass } from './shared.js';

type Props = WithElementRef<Omit<HTMLFormAttributes, 'onsubmit'>, HTMLFormElement> & {
		name?: string;
		email?: string;
		phone?: string;
		password?: string;
		confirmPassword?: string;
		loading?: boolean;
		error?: string;
		copy?: AuthRegisterCopy;
		title?: string;
		subtitle?: string;
		submitLabel?: string;
		onSubmit?: (payload: { name: string; email: string; phone: string; password: string }) => void;
		googleHref?: string;
		footer?: import('svelte').Snippet;
	};

	let {
		ref = $bindable(null),
		name = $bindable(''),
		email = $bindable(''),
		phone = $bindable(''),
		password = $bindable(''),
		confirmPassword = $bindable(''),
		loading = false,
		error,
		copy: copyProp,
		title,
		subtitle,
		submitLabel,
		onSubmit,
		googleHref = '/api/auth/google',
		class: className,
		footer,
		...rest
	}: Props = $props();

	const copy = $derived(copyProp ?? authCopy[$locale].register);
	const emailError = $derived(
		email.trim().length > 0 && !isValidEmail(email) ? copy.validation.invalidEmail : null
	);
	const passwordStrength = $derived(assessPassword(password));
	const localizedChecks = $derived(
		passwordStrength.checks.map((check) => ({
			...check,
			label: copy.passwordStrength.checks[check.id as PasswordCheckId]
		}))
	);
	const passwordError = $derived(
		!password || passwordStrength.valid
			? null
			: copy.passwordStrength.requirement(
					localizedChecks.find((check) => !check.met)?.label ?? ''
				)
	);
	const confirmPasswordError = $derived(
		confirmPassword && password !== confirmPassword ? copy.validation.passwordMismatch : null
	);

	const strengthLabelClass = $derived(
		({
			negative: 'text-status-urgent-ink',
			warning: 'text-status-progress-ink',
			queued: 'text-status-queued-ink',
			positive: 'text-status-done-ink'
		})[passwordStrength.tone]
	);
	const strengthLabel = $derived(
		password.length > 0 ? copy.passwordStrength.levels[passwordStrength.tone] : ''
	);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (emailError || passwordError || confirmPasswordError || !passwordStrength.valid) return;
		onSubmit?.({ name, email: normalizeEmail(email), phone: phone.trim(), password });
	}
</script>

<form
	bind:this={ref}
	onsubmit={submit}
	class={cn(
		cardShellClass,
		'relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-hairline bg-card p-6 shadow-card md:p-8',
		className
	)}
	{...rest}
>

	<div class="mb-7">
		<div class="mb-5 flex justify-end">
			<span class="rounded-full border border-primary-border bg-primary-soft px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-primary-ink">
				{copy.signal}
			</span>
		</div>
		<p class="text-[11px] font-bold uppercase tracking-[0.08em] text-faint">{copy.eyebrow}</p>
		<h1 class="font-display mt-2 text-3xl font-extrabold leading-tight tracking-[-0.035em] text-ink">
			{title ?? copy.title}
		</h1>
		<p class="ds-body mt-2 text-mute">{subtitle ?? copy.subtitle}</p>
	</div>

<div class="mb-6 space-y-4">
	<GoogleButton href={googleHref} label={copy.google.button} />
	<div class="flex items-center gap-3">
		<div class="h-px flex-1 bg-hairline"></div>
		<span class="text-xs font-medium text-faint">{copy.google.divider}</span>
		<div class="h-px flex-1 bg-hairline"></div>
	</div>
</div>

	<div class="space-y-4">
		<FormField label={copy.fields.name.label} required>
			{#snippet control(args)}
				<AtomInput
					{...args}
					bind:value={name}
					placeholder={copy.fields.name.placeholder}
					autocomplete="name"
				/>
			{/snippet}
		</FormField>

		<FormField label={copy.fields.phone.label} required>
			{#snippet control(args)}
				<AtomInput
					{...args}
					bind:value={phone}
					placeholder={copy.fields.phone.placeholder}
					autocomplete="tel"
				/>
			{/snippet}
		</FormField>

		<FormField label={copy.fields.email.label} required error={emailError ?? undefined}>
			{#snippet control(args)}
				<AtomInput
					{...args}
					type="email"
					bind:value={email}
					placeholder={copy.fields.email.placeholder}
					autocomplete="email"
					invalid={Boolean(emailError || error)}
				/>
			{/snippet}
		</FormField>

		<FormField label={copy.fields.password.label} required error={passwordError ?? undefined}>
			{#snippet control(args)}
				<PasswordInput
					{...args}
					bind:value={password}
					placeholder={copy.fields.password.placeholder}
					autocomplete="new-password"
					showPasswordLabel={copy.fields.password.showPassword}
					hidePasswordLabel={copy.fields.password.hidePassword}
					invalid={Boolean(passwordError || error)}
				/>
			{/snippet}
		</FormField>

		{#if password.length > 0}
			<div class="space-y-2.5 rounded-xl border border-hairline bg-canvas-sunken px-3 py-3" aria-live="polite">
				<div class="flex items-center justify-between gap-2">
					<span class="ds-caption text-mute">{copy.passwordStrength.label}</span>
					{#if strengthLabel}
						<span class={cn('ds-caption font-semibold', strengthLabelClass)}>{strengthLabel}</span>
					{/if}
				</div>
				<ProgressBar value={passwordStrength.score} max={passwordStrength.maxScore} tone={passwordStrength.tone} size="sm" />
				<ul class="space-y-1.5">
					{#each localizedChecks as check (check.id)}
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

		<FormField label={copy.fields.confirmPassword.label} required error={confirmPasswordError ?? undefined}>
			{#snippet control(args)}
				<PasswordInput
					{...args}
					bind:value={confirmPassword}
					placeholder={copy.fields.confirmPassword.placeholder}
					autocomplete="new-password"
					showPasswordLabel={copy.fields.confirmPassword.showPassword}
					hidePasswordLabel={copy.fields.confirmPassword.hidePassword}
					invalid={Boolean(confirmPasswordError)}
				/>
			{/snippet}
		</FormField>

		{#if error}
			<p class="ds-caption rounded-xl border border-status-urgent/25 bg-status-urgent-soft px-3 py-2.5 text-status-urgent-ink">
				{error}
			</p>
		{/if}

		<Button type="submit" variant="primary" class="w-full" {loading}>
			{submitLabel ?? copy.submitLabel}
		</Button>
	</div>

	{#if footer}
		<div class="mt-6 border-t border-hairline pt-4 text-center ds-body text-mute">{@render footer()}</div>
	{/if}
</form>
