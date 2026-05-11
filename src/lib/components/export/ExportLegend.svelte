<script lang="ts">
	import type { ExportData } from '$lib/utils/svg-export';
	import type { IconShape } from '$lib/types';
	import type { RoutePoint } from '$lib/types';
	import { getTransitType, getInterchangeHiddenLineIds, BADGE_SIZE } from '$lib/utils/svg-export';
	import { getContrastColor } from '$lib/utils/color';

	let {
		data,
		lx,
		ly,
		legendWidth,
		legendHeight
	}: {
		data: ExportData;
		lx: number;
		ly: number;
		legendWidth: number;
		legendHeight: number;
	} = $props();

	const allLegendLines = (() => {
		const hiddenLines = new Set(data.hiddenLineIds);
		const visibleLines = data.lines.filter((l) => l.id && !hiddenLines.has(l.id));
		const hiddenInterchangeIds = getInterchangeHiddenLineIds(data);
		const hiddenInterchangeLines = data.lines.filter((l) => l.id && hiddenInterchangeIds.has(l.id));
		return [...visibleLines, ...hiddenInterchangeLines].sort((a, b) => {
			if ((a.transitTypeId ?? -1) !== (b.transitTypeId ?? -1))
				return (a.transitTypeId ?? -1) - (b.transitTypeId ?? -1);
			return (a.name ?? '').localeCompare(b.name ?? '');
		});
	})();

	const pad = 16;
	const termFontSize = 13;
</script>

{#if allLegendLines.length > 0}
	<rect
		x={lx}
		y={ly}
		width={legendWidth}
		height={legendHeight}
		fill="#f4f4f4"
		stroke="#bbb"
		stroke-width="1"
	/>

	{#each allLegendLines as line, idx (line.id)}
		{@const tt = getTransitType(line, data)}
		{@const shape = (tt?.iconShape ?? 'square') as IconShape}
		{@const textColor = getContrastColor(line.color)}
		{@const cx = lx + pad + BADGE_SIZE / 2}
		{@const cy = ly + pad + idx * 40 + 20}
		{@const half = BADGE_SIZE / 2}
		{@const isDiamond = shape === 'diamond'}
		{@const diamondHalf = isDiamond ? half / Math.SQRT2 : half}
		{@const diamondSize = diamondHalf * 2}
		{@const fontSize = isDiamond
			? Math.max(7, Math.min(10, BADGE_SIZE * 0.35))
			: Math.max(10, Math.min(13, BADGE_SIZE * 0.5))}
		{@const textDY = fontSize * 0.35}

		{@const rps = data.routePoints
			.filter((rp: RoutePoint) => rp.lineId === line.id)
			.sort((a: RoutePoint, b: RoutePoint) => a.order - b.order)}
		{@const firstSt = rps.length > 0 ? data.stations.find((s) => s.id === rps[0].stationId) : null}
		{@const lastSt =
			rps.length > 0 ? data.stations.find((s) => s.id === rps[rps.length - 1].stationId) : null}
		{@const termX = lx + pad + BADGE_SIZE + 8}
		{@const entryY = ly + pad + idx * 40}

		<g>
			{#if shape === 'circle'}
				<circle {cx} {cy} r={half} fill={line.color} stroke="white" stroke-width="1.5" />
			{:else if shape === 'square'}
				<rect
					x={cx - half}
					y={cy - half}
					width={BADGE_SIZE}
					height={BADGE_SIZE}
					rx="2"
					fill={line.color}
					stroke="white"
					stroke-width="1.5"
				/>
			{:else if shape === 'diamond'}
				<rect
					x={cx - diamondHalf}
					y={cy - diamondHalf}
					width={diamondSize}
					height={diamondSize}
					rx="2"
					fill={line.color}
					stroke="white"
					stroke-width="1.5"
					transform="rotate(45, {cx}, {cy})"
				/>
			{:else}
				<rect
					x={cx - half}
					y={cy - half}
					width={BADGE_SIZE}
					height={BADGE_SIZE}
					rx={half}
					fill={line.color}
					stroke="white"
					stroke-width="1.5"
				/>
			{/if}
			<text
				x={cx}
				y={cy + textDY}
				text-anchor="middle"
				font-family="sans-serif"
				font-size={fontSize}
				font-weight="bold"
				fill={textColor}>{line.name}</text
			>
		</g>

		<text x={termX} y={entryY + 15} font-size={termFontSize} font-family="sans-serif" fill="#555"
			>{firstSt?.name ?? '???'}</text
		>
		<text x={termX} y={entryY + 31} font-size={termFontSize} font-family="sans-serif" fill="#555"
			>{lastSt?.name ?? '???'}</text
		>
	{/each}
{/if}
