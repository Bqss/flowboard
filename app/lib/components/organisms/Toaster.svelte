<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { toast } from '../molecules/toast-state.svelte.js';
	import Toast from '../molecules/Toast.svelte';

	type Props = {
		position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'bottom-center' | 'top-center';
		class?: string;
	};

	let { position = 'bottom-right', class: className = '' }: Props = $props();

	const positionClasses = {
		'bottom-right': 'bottom-6 right-6 items-end',
		'bottom-left': 'bottom-6 left-6 items-start',
		'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2 items-center',
		'top-right': 'top-6 right-6 items-end',
		'top-left': 'top-6 left-6 items-start',
		'top-center': 'top-6 left-1/2 -translate-x-1/2 items-center'
	} as const;

	const flyDirection = $derived(position.startsWith('top') ? -16 : 16);
</script>

<div
	aria-label="Notifikasi"
	class="pointer-events-none fixed z-[120] flex flex-col gap-2.5 max-w-full px-4 sm:px-0 {positionClasses[position]} {className}"
>
	{#each toast.items as item (item.id)}
		<div
			in:fly={{ y: flyDirection, duration: 200 }}
			out:fade={{ duration: 150 }}
			class="pointer-events-auto"
		>
			<Toast
				id={item.id}
				message={item.message}
				description={item.description}
				tone={item.tone}
				action={item.action}
				onclose={() => toast.dismiss(item.id)}
			/>
		</div>
	{/each}
</div>
