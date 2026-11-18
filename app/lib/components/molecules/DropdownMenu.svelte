<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { DropdownMenu as MenuPrimitive } from 'bits-ui';
	import Portal from '$lib/components/atoms/Portal.svelte';
	import { cn, type WithElementRef } from '$lib/utils.js';
	import { Avatar } from '$lib/components/atoms/index.js';
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import { ArrowRight01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
	import { panelClass, panelItemClass, type MenuItem } from './shared.js';

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		items: MenuItem[];
		open?: boolean;
		align?: 'start' | 'end';
		side?: 'bottom' | 'top';
		label?: string;
		trigger: import('svelte').Snippet<[{ open: boolean; toggle: () => void }]>;
		class?: string;
	};

	let {
		ref = $bindable(null),
		items,
		open = $bindable(false),
		align = 'end',
		side = 'bottom',
		label = 'Menu',
		trigger,
		class: className,
		...rest
	}: Props = $props();

	// Bits opens the menu from the trigger wrapper (pointer + keyboard).
	// The caller's `toggle` is a no-op so a click doesn't open and close it again.
	const noopToggle = () => {};

	function selectItem(item: MenuItem) {
		if (item.disabled) return;
		item.onselect?.();
	}
</script>

{#snippet menuItemContent(item: MenuItem)}
	<span class="flex min-w-0 items-center gap-2.5">
		{#if item.avatar}
			<Avatar name={item.avatar.name} src={item.avatar.src ?? undefined} size={24} class="ring-0" />
		{:else if item.icon}
			<span class="grid size-4 shrink-0 place-items-center text-current [&_svg]:size-4">
				{@render item.icon()}
			</span>
		{/if}
		<span class="min-w-0">
			<span class="block truncate">{item.label}</span>
			{#if item.description}
				<span class="mt-0.5 block truncate text-xs font-normal text-mute">{item.description}</span>
			{/if}
		</span>
	</span>
{/snippet}

<MenuPrimitive.Root bind:open>
	<MenuPrimitive.Trigger>
		{#snippet child({ props })}
			<span bind:this={ref} class={cn('relative inline-flex', className)} {...props} {...(rest as Record<string, unknown>)}>
				{@render trigger({ open, toggle: noopToggle })}
			</span>
		{/snippet}
	</MenuPrimitive.Trigger>

	<Portal>
		<MenuPrimitive.Content
			{side}
			align={align === 'end' ? 'end' : 'start'}
			sideOffset={6}
			aria-label={label}
			class={cn(panelClass, 'z-[400] overflow-visible')}
		>
			{#each items as item, i (item.label + i)}
				{#if item.separatorBefore && i > 0}
					<MenuPrimitive.Separator class="my-1 h-px bg-hairline" />
				{/if}

				{#if item.submenu}
					<MenuPrimitive.Sub>
						<MenuPrimitive.SubTrigger
							class={cn(panelItemClass, 'justify-between whitespace-nowrap')}
						>
							{@render menuItemContent(item)}
							<HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={1.8} class="shrink-0 text-mute" />
						</MenuPrimitive.SubTrigger>
						<MenuPrimitive.SubContent class={cn(panelClass, 'z-[410] min-w-[15rem] p-1')}>
							{#each item.submenu as submenuItem, submenuIndex (submenuItem.label + submenuIndex)}
								{#if submenuItem.separatorBefore && submenuIndex > 0}
									<MenuPrimitive.Separator class="my-1 h-px bg-hairline" />
								{/if}
								<MenuPrimitive.Item
									disabled={submenuItem.disabled}
									onSelect={() => selectItem(submenuItem)}
									class={cn(
										panelItemClass,
										'justify-between whitespace-nowrap',
										submenuItem.active && 'bg-primary-soft',
										submenuItem.destructive && 'text-status-urgent hover:bg-status-urgent-soft',
										submenuItem.active && submenuItem.disabled && 'text-ink'
									)}
								>
									{@render menuItemContent(submenuItem)}
									{#if submenuItem.shortcut}
										<span class="ds-caption ds-mono pl-6 text-faint">{submenuItem.shortcut}</span>
									{/if}
									{#if submenuItem.active}
										<HugeiconsIcon icon={Tick02Icon} size={15} strokeWidth={2} class="shrink-0 text-primary" />
									{/if}
								</MenuPrimitive.Item>
							{/each}
						</MenuPrimitive.SubContent>
					</MenuPrimitive.Sub>
				{:else}
					<MenuPrimitive.Item
						disabled={item.disabled}
						onSelect={() => selectItem(item)}
						class={cn(
							panelItemClass,
							'justify-between whitespace-nowrap',
							item.active && 'bg-primary-soft',
							item.destructive && 'text-status-urgent hover:bg-status-urgent-soft',
							item.active && item.disabled && 'text-ink'
						)}
					>
						{@render menuItemContent(item)}
						{#if item.shortcut}
							<span class="ds-caption ds-mono pl-6 text-faint">{item.shortcut}</span>
						{/if}
						{#if item.active}
							<HugeiconsIcon icon={Tick02Icon} size={15} strokeWidth={2} class="shrink-0 text-primary" />
						{/if}
					</MenuPrimitive.Item>
				{/if}
			{/each}
		</MenuPrimitive.Content>
	</Portal>
</MenuPrimitive.Root>
