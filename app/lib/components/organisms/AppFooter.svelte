<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Logo } from '$lib/components/atoms/index.js';
	import type { FooterLink } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLElement>> & {
		links?: FooterLink[];
		note?: string;
		class?: string;
	};

	let {
		ref = $bindable(null),
		links = [],
		note = '© DripLab · DripDesk Internal',
		class: className,
		...rest
	}: Props = $props();
</script>

<footer
	bind:this={ref}
	class={cn('border-t border-hairline bg-rail px-6 py-8', className)}
	{...rest}
>
	<div class="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex items-center gap-3">
			<Logo size={36} />
			<p class="ds-caption text-mute">{note}</p>
		</div>

		{#if links.length}
			<ul class="flex flex-wrap gap-x-5 gap-y-2">
				{#each links as link, i (`${link.label}-${i}`)}
					<li>
						<a
							href={link.href}
							class="ds-body text-mute underline-offset-4 transition-colors hover:text-ink hover:underline"
						>
							{link.label}
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</footer>
