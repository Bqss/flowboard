import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

type BackdropOpts = { duration?: number };

type PanelOpts = {
	duration?: number;
	y?: number;
	startScale?: number;
};

/** Fade scrim in/out — pair with `transition:modalBackdrop` on the modal overlay. */
export function modalBackdrop(
	_node: Element,
	{ duration = 220 }: BackdropOpts = {}
): TransitionConfig {
	return {
		duration,
		easing: cubicOut,
		css: (t) => `opacity: ${t};`
	};
}

/** Subtle lift + scale for modal panels — pair with `transition:modalPanel`. */
export function modalPanel(
	_node: Element,
	{ duration = 300, y = 10, startScale = 0.97 }: PanelOpts = {}
): TransitionConfig {
	return {
		duration,
		easing: cubicOut,
		css: (t) => {
			const scale = startScale + (1 - startScale) * t;
			const translateY = (1 - t) * y;
			return `opacity: ${t}; transform: translate3d(0, ${translateY}px, 0) scale(${scale});`;
		}
	};
}
