<script lang="ts">
	import type { HTMLFormAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { isValidEmail, normalizeEmail } from '$lib/email.js';
	import { authCopy, type AuthLoginCopy } from '$lib/i18n/auth.js';
	import { locale } from '$lib/i18n/index.js';
	import { Button, Checkbox, GoogleButton } from '$lib/components/atoms/index.js';
	import { FormField, PasswordInput } from '$lib/components/molecules/index.js';
	import { Input as AtomInput } from '$lib/components/atoms/index.js';
	import { cardShellClass } from './shared.js';

	type Props = WithElementRef<Omit<HTMLFormAttributes, 'onsubmit'>, HTMLFormElement> & {
		email?: string;
		password?: string;
		remember?: boolean;
		loading?: boolean;
		error?: string;
		copy?: AuthLoginCopy;
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
		copy: copyProp,
		title,
		subtitle,
		submitLabel,
		onSubmit,
		class: className,
		footer,
		...rest
	}: Props = $props();

	const copy = $derived(copyProp ?? authCopy[$locale].login);
	const emailError = $derived(
		email.trim().length > 0 && !isValidEmail(email) ? copy.validation.invalidEmail : null
	);

	function submit(event: SubmitEvent) {
		event.preventDefault();
		if (emailError) return;
		onSubmit?.({ email: normalizeEmail(email), password, remember });
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
	<GoogleButton href="/api/auth/google" label={copy.google.button} />
	<div class="flex items-center gap-3">
		<div class="h-px flex-1 bg-hairline"></div>
		<span class="text-xs font-medium text-faint">{copy.google.divider}</span>
		<div class="h-px flex-1 bg-hairline"></div>
	</div>
</div>

	<div class="space-y-4">
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

		<FormField label={copy.fields.password.label} required>
			{#snippet control(args)}
				<PasswordInput
					{...args}
					bind:value={password}
					placeholder={copy.fields.password.placeholder}
					showPasswordLabel={copy.fields.password.showPassword}
					hidePasswordLabel={copy.fields.password.hidePassword}
					invalid={Boolean(error)}
				/>
			{/snippet}
		</FormField>

		{#if error}
			<p class="ds-caption rounded-xl border border-status-urgent/25 bg-status-urgent-soft px-3 py-2.5 text-status-urgent-ink">
				{error}
			</p>
		{/if}

		<label class="flex items-center gap-2.5">
			<Checkbox bind:checked={remember} />
			<span class="ds-body text-ink">{copy.remember}</span>
		</label>

		<Button type="submit" variant="primary" class="w-full" {loading}>
			{submitLabel ?? copy.submitLabel}
		</Button>
	</div>

	{#if footer}
		<div class="mt-6 border-t border-hairline pt-4 text-center ds-body text-mute">{@render footer()}</div>
	{/if}
</form>
