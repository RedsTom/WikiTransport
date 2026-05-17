<script lang="ts">
	let {
		x = 0,
		y = 0,
		width = 0,
		height = 0
	}: {
		x: number;
		y: number;
		width: number;
		height: number;
	} = $props();
</script>

<rect
	{x}
	{y}
	{width}
	{height}
	fill="rgba(100, 150, 255, 0.1)"
	stroke="rgba(100, 150, 255, 0.6)"
	stroke-width="1.5"
	stroke-dasharray="4,3"
	pointer-events="none"
/>
