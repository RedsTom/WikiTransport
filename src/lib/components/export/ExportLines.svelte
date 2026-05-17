<script lang="ts">
	import type { ExportData } from '$lib/utils/svg-export';
	import { getOffsetPath, createPathFromPoints, scaleDashPattern } from '$lib/utils/schematic';
	import type { Point } from '$lib/utils/schematic';
	import { LINE_WIDTH } from '$lib/constants/schematic';

	let {
		data,
		renderingData
	}: {
		data: ExportData;
		renderingData: {
			basePaths: Map<number, Point[]>;
			tunnelOffsets: Map<string, Map<number, Point>>;
			stationPoints: Set<string>;
		};
	} = $props();
</script>

{#each data.lines as line (line.id)}
	{@const hiddenLineIds = new Set(data.hiddenLineIds)}
	{@const isHidden = !line.id || hiddenLineIds.has(line.id)}
	{#if !isHidden}
		{@const basePath = renderingData.basePaths.get(line.id!) ?? []}
		{@const { offsetPath, roundAt } = getOffsetPath(
			basePath,
			line.id!,
			renderingData.tunnelOffsets,
			renderingData.stationPoints,
			undefined,
			data.cornerRadii
		)}
		{#if offsetPath.length > 1}
			{@const dashAttr = scaleDashPattern(line.dashPattern, line.strokeWidth ?? LINE_WIDTH)}
			<path
				d={createPathFromPoints(offsetPath, roundAt)}
				fill="none"
				stroke={line.color}
				stroke-width={line.strokeWidth ?? LINE_WIDTH}
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-dasharray={dashAttr}
			/>
		{/if}
	{/if}
{/each}
