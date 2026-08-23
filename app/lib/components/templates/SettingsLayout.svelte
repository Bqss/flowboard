<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { TabItem } from '../molecules/shared.js';
	import DashboardLayout from './DashboardLayout.svelte';
	import { SettingsPanel } from '../organisms/index.js';
	import type { DashboardShellProps } from './shared.js';

	type Props = DashboardShellProps & {
		sections: TabItem[];
		value?: string;
		settingsTitle?: string;
		settingsDescription?: string;
		onchange?: (value: string) => void;
		content: Snippet<[string]>;
	};

	let {
		title,
		subtitle,
		nav,
		adminNav = [],
		mobileNav = nav,
		userName,
		userSrc,
		search = $bindable(''),
		showSearch = true,
		sections,
		value = $bindable(sections[0]?.value ?? ''),
		settingsTitle = 'Pengaturan',
		settingsDescription,
		onchange,
		class: className,
		topbarActions,
		embedded = false,
		content: panelContent
	}: Props = $props();
</script>

<DashboardLayout
	{title}
	{subtitle}
	{nav}
	{adminNav}
	{mobileNav}
	{userName}
	userSrc={userSrc}
	bind:search
	{showSearch}
	{embedded}
	class={className}
	{topbarActions}
>
	{#snippet children()}
		<SettingsPanel {sections} bind:value title={settingsTitle} description={settingsDescription} {onchange}>
			{#snippet content(tab)}
				{@render panelContent(tab)}
			{/snippet}
		</SettingsPanel>
	{/snippet}
</DashboardLayout>
