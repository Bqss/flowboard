import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import { createTV } from 'tailwind-variants';

/**
 * tailwind-merge doesn't know the custom design-system type scale (ds.css @theme),
 * so `text-meta` looked like a text colour and was dropped next to `text-mute`.
 * Register the custom font sizes so cn() treats them as font-size.
 */
const FONT_SIZE_GROUP = { 'font-size': [{ text: ['tiny', 'micro', 'badge', 'meta', 'heading-lg'] }] };

const twMerge = extendTailwindMerge({
	extend: {
		classGroups: FONT_SIZE_GROUP
	}
});

/**
 * `tv` for atoms (Button, Badge, IconButton). Uses the same extended font-size group, otherwise
 * tailwind-variants' default merger treats `text-meta` as a colour and drops `text-on-primary`.
 */
export const tv = createTV({
	twMergeConfig: {
		extend: {
			classGroups: FONT_SIZE_GROUP
		}
	}
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export type WithElementRef<T, E extends HTMLElement = HTMLElement> = T & {
	ref?: E | null;
};
