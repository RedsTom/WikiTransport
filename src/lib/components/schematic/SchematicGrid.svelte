<script lang="ts">
	import { GRID_SIZE } from '$lib/constants/schematic';

	let {
		viewBoxX = 0,
		viewBoxY = 0,
		viewBoxWidth = 1000,
		viewBoxHeight = 1000
	}: {
		viewBoxX?: number;
		viewBoxY?: number;
		viewBoxWidth?: number;
		viewBoxHeight?: number;
	} = $props();
</script>

<defs>
	<pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
		<path
			d="M {GRID_SIZE} 0 L 0 0 0 {GRID_SIZE}"
			fill="none"
			stroke="currentColor"
			stroke-width="1"
			class="text-outline/25"
		/>
	</pattern>
</defs>

<rect
	x={viewBoxX - viewBoxWidth}
	y={viewBoxY - viewBoxHeight}
	width={viewBoxWidth * 3}
	height={viewBoxHeight * 3}
	fill="url(#grid)"
/>
