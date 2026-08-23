export type ShowcaseCategory = {
	href: string;
	label: string;
	description: string;
	count: number;
};

export const categories: ShowcaseCategory[] = [
	{
		href: '/design-system',
		label: 'Overview',
		description: 'Tokens, guidelines, and inventory',
		count: 0
	},
	{
		href: '/design-system/atoms',
		label: 'Atoms',
		description: 'Buttons, inputs, badges, typography primitives',
		count: 30
	},
	{
		href: '/design-system/molecules',
		label: 'Molecules',
		description: 'Composed controls — tabs, forms, stat cards',
		count: 35
	},
	{
		href: '/design-system/organisms',
		label: 'Organisms',
		description: 'Board, dialogs, layout chrome, data views',
		count: 36
	}
];

export const isActiveCategory = (pathname: string, href: string) =>
	href === '/design-system' ? pathname === href : pathname.startsWith(href);
