<script lang="ts" module>
	export type FormFieldControl = {
		id: string;
		invalid: boolean;
		'aria-describedby': string | undefined;
		'aria-errormessage': string | undefined;
	};
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Label, HelperText, ErrorText } from '$lib/components/atoms/index.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		label?: string;
		required?: boolean;
		helper?: string;
		error?: string;
		orientation?: 'vertical' | 'horizontal';
		class?: string;
		control: Snippet<[FormFieldControl]>;
	};

	let {
		ref = $bindable(null),
		label,
		required = false,
		helper,
		error,
		orientation = 'vertical',
		class: className,
		control,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const controlId = `${uid}-control`;
	const helperId = `${uid}-helper`;
	const errorId = `${uid}-error`;

	const invalid = $derived(Boolean(error));
	const describedBy = $derived(
		[helper ? helperId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<div
	bind:this={ref}
	class={cn(
		orientation === 'horizontal'
			? 'grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-start gap-4'
			: 'w-full',
		className
	)}
	{...rest}
>
	{#if label}
		<Label for={controlId} {required} class={orientation === 'horizontal' ? 'pt-2.5' : 'mb-1.5'}>
			{label}
		</Label>
	{/if}

	<div class="min-w-0">
		{@render control({
			id: controlId,
			invalid,
			'aria-describedby': describedBy,
			'aria-errormessage': error ? errorId : undefined
		})}

		{#if error}
			<ErrorText id={errorId}>{error}</ErrorText>
		{:else if helper}
			<HelperText id={helperId}>{helper}</HelperText>
		{/if}
	</div>
</div>
