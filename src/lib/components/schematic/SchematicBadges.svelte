<script lang="ts">
	import { getContrastColor } from '$lib/utils/color';
	import type { IconShape } from '$lib/types';

	let {
		shape,
		cx,
		cy,
		color,
		label
	}: {
		shape: IconShape;
		cx: number;
		cy: number;
		color: string;
		label: string;
	} = $props();

	const BADGE_HALF = 10;
	const DIAMOND_HALF = BADGE_HALF / Math.SQRT2;
	const DIAMOND_SIZE = DIAMOND_HALF * 2;
	const textColor = $derived(getContrastColor(color));
</script>

{#if shape === 'circle'}
	<circle
		{cx}
		{cy}
		r={BADGE_HALF}
		fill={color}
		stroke="white"
		stroke-width="1.5"
		class="pointer-events-none"
	/>
{:else if shape === 'square'}
	<rect
		x={cx - BADGE_HALF}
		y={cy - BADGE_HALF}
		width={BADGE_HALF * 2}
		height={BADGE_HALF * 2}
		rx="2"
		fill={color}
		stroke="white"
		stroke-width="1.5"
		class="pointer-events-none"
	/>
{:else if shape === 'diamond'}
	<rect
		x={cx - DIAMOND_HALF}
		y={cy - DIAMOND_HALF}
		width={DIAMOND_SIZE}
		height={DIAMOND_SIZE}
		rx="2"
		fill={color}
		stroke="white"
		stroke-width="1.5"
		transform="rotate(45, {cx}, {cy})"
		class="pointer-events-none"
	/>
{:else}
	<rect
		x={cx - BADGE_HALF}
		y={cy - BADGE_HALF}
		width={BADGE_HALF * 2}
		height={BADGE_HALF * 2}
		rx={BADGE_HALF}
		fill={color}
		stroke="white"
		stroke-width="1.5"
		class="pointer-events-none"
	/>
{/if}
<text
	x={cx}
	y={cy + (shape === 'diamond' ? 2.1 : 3.5)}
	text-anchor="middle"
	font-family="sans-serif"
	font-size={shape === 'diamond' ? 7 : 10}
	font-weight="bold"
	fill={textColor}
	class="pointer-events-none"
>
	{label}
</text>
