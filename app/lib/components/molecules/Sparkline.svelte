<script lang="ts">
	import { cn } from '$lib/utils.js';

	type Props = {
		ref?: SVGSVGElement | null;
		data: number[];
		width?: number;
		height?: number;
		stroke?: string;
		fill?: string;
		inverse?: boolean;
		class?: string;
	};

	let {
		ref = $bindable(null),
		data,
		width = 80,
		height = 32,
		stroke,
		fill,
		inverse = false,
		class: className
	}: Props = $props();

	const path = $derived.by(() => {
		if (!data.length) return '';
		const min = Math.min(...data);
		const max = Math.max(...data);
		const range = max - min || 1;
		const pad = 2;

		const points = data.map((v, i) => {
			const x = pad + (i / Math.max(data.length - 1, 1)) * (width - pad * 2);
			const y = pad + (1 - (v - min) / range) * (height - pad * 2);
			return `${x},${y}`;
		});

		const line = `M ${points.join(' L ')}`;
		const area = `${line} L ${width - pad},${height - pad} L ${pad},${height - pad} Z`;
		return { line, area };
	});

	const strokeColor = $derived(stroke ?? (inverse ? '#FFFFFF' : 'var(--color-primary, #4f46e5)'));
	const fillColor = $derived(
		fill ?? (inverse ? 'rgba(255,255,255,0.12)' : 'rgba(79,70,229,0.08)')
	);
</script>

<svg
	bind:this={ref}
	viewBox={`0 0 ${width} ${height}`}
	width={width}
	height={height}
	class={cn('shrink-0 overflow-visible', className)}
	aria-hidden="true"
>
	{#if path}
		<path d={path.area} fill={fillColor} />
		<path
			d={path.line}
			fill="none"
			stroke={strokeColor}
			stroke-width="1.75"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{/if}
</svg>
