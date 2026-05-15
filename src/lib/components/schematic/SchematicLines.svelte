<script lang="ts">
	import { editorState } from '$lib/store/editor.svelte';
	import { createOctilinearPath, scaleDashPattern } from '$lib/utils/schematic';
	import { LINE_WIDTH } from '$lib/constants/schematic';

	type SegOffsetMap = Map<number, Map<string, { x: number; y: number }>>;

	let { lineOffsets }: { lineOffsets: SegOffsetMap } = $props();
</script>

{#each editorState.lines as line (line.id)}
	{@const isHidden = editorState.effectiveHiddenLineIds.has(line.id!)}
	{#if !isHidden}
		{@const points = editorState.routePointsByLine.get(line.id!) ?? []}
		{@const segOffMap = lineOffsets.get(line.id!)}
		{@const lineAnchors = editorState.anchorPointsByLine.get(line.id!) ?? []}
		{@const allCoords = (() => {
			const coords: { x: number; y: number; order: number }[] = [];
			for (let i = 0; i < points.length; i++) {
				const rp = points[i];
				const s = editorState.stationMap.get(rp.stationId);
				if (!s) continue;
				const pos = editorState.stationPosition(s);
				let offX = 0,
					offY = 0,
					cnt = 0;
				const addOff = (a: number, b: number) => {
					const k = `${Math.min(a, b)},${Math.max(a, b)}`;
					const o = segOffMap?.get(k);
					if (o) {
						offX += o.x;
						offY += o.y;
						cnt++;
					}
				};
				if (i > 0) addOff(points[i - 1].stationId, rp.stationId);
				if (i < points.length - 1) addOff(rp.stationId, points[i + 1].stationId);
				if (cnt > 0) {
					offX /= cnt;
					offY /= cnt;
				}
				coords.push({ x: pos.x + offX, y: pos.y + offY, order: rp.order });
			}
			for (const ap of lineAnchors) {
				const beforeRps = points.filter((rp) => rp.order < ap.order);
				const afterRps = points.filter((rp) => rp.order > ap.order);
				if (beforeRps.length === 0 || afterRps.length === 0) {
					coords.push({ x: ap.schematicX, y: ap.schematicY, order: ap.order });
					continue;
				}
				const k = `${Math.min(beforeRps[beforeRps.length - 1].stationId, afterRps[0].stationId)},${Math.max(beforeRps[beforeRps.length - 1].stationId, afterRps[0].stationId)}`;
				const o = segOffMap?.get(k);
				coords.push({
					x: ap.schematicX + (o?.x ?? 0),
					y: ap.schematicY + (o?.y ?? 0),
					order: ap.order
				});
			}
			coords.sort((a, b) => a.order - b.order);
			return coords;
		})()}

		{#if allCoords.length > 1}
			<path
				d={createOctilinearPath(allCoords)}
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
