<script lang="ts">
	import { editorState } from '$lib/store/editor.svelte';
	import { getOffsetPath, createPathFromPoints, scaleDashPattern } from '$lib/utils/schematic';
	import type { Point } from '$lib/utils/schematic';
	import { LINE_WIDTH } from '$lib/constants/schematic';

	let {
		renderingData
	}: {
		renderingData: {
			basePaths: Map<number, Point[]>;
			tunnelOffsets: Map<string, Map<number, Point>>;
			stationPoints: Set<string>;
		};
	} = $props();
</script>

{#each editorState.lines as line (line.id)}
	{@const isHidden = editorState.effectiveHiddenLineIds.has(line.id!)}
	{#if !isHidden}
		{@const basePath = renderingData.basePaths.get(line.id!) ?? []}
		{@const { offsetPath, roundAt } = getOffsetPath(
			basePath,
			line.id!,
			renderingData.tunnelOffsets,
			renderingData.stationPoints,
			undefined,
			editorState.cornerRadii
		)}
		{#if offsetPath.length > 1}
			<path
				d={createPathFromPoints(offsetPath, roundAt)}
				fill="none"
				stroke={line.color}
				stroke-width={line.strokeWidth ?? LINE_WIDTH}
				stroke-dasharray={scaleDashPattern(line.dashPattern, line.strokeWidth ?? LINE_WIDTH)}
				stroke-linecap="round"
				stroke-linejoin="round"
				opacity={editorState.selectedLineId === line.id ? 1 : 0.7}
				data-line={line.id}
				class="cursor-pointer"
			/>
		{/if}
	{/if}
{/each}
