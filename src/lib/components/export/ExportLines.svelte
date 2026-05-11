<script lang="ts">
	import type { ExportData } from '$lib/utils/svg-export';
	import { createOctilinearPath, scaleDashPattern } from '$lib/utils/schematic';
	import { LINE_WIDTH } from '$lib/constants/schematic';
	import { stationPos } from '$lib/utils/svg-export';

	let {
		data,
		isGlobal,
		lineOffsets
	}: {
		data: ExportData;
		isGlobal: boolean;
		lineOffsets: Map<number, Map<string, { x: number; y: number }>>;
	} = $props();

	function computeLineCoords(lineId: number) {
		const rps = data.routePoints
			.filter((rp) => rp.lineId === lineId)
			.sort((a, b) => a.order - b.order);
		const segOffMap = lineOffsets.get(lineId);
		const lineAnchors = data.anchorPoints
			.filter((ap) => ap.lineId === lineId)
			.sort((a, b) => a.order - b.order);

		const coords: { x: number; y: number; order: number }[] = [];
		for (let i = 0; i < rps.length; i++) {
			const rp = rps[i];
			const s = data.stations.find((st) => st.id === rp.stationId);
			if (!s) continue;
			const pos = stationPos(s, data.viewStations, isGlobal);
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
			if (i > 0) addOff(rps[i - 1].stationId, rp.stationId);
			if (i < rps.length - 1) addOff(rp.stationId, rps[i + 1].stationId);
			if (cnt > 0) {
				offX /= cnt;
				offY /= cnt;
			}
			coords.push({ x: pos.x + offX, y: pos.y + offY, order: rp.order });
		}
		for (const ap of lineAnchors) {
			const beforeRps = rps.filter((rp) => rp.order < ap.order);
			const afterRps = rps.filter((rp) => rp.order > ap.order);
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
	}
</script>

{#each data.lines as line (line.id)}
	{@const hiddenLineIds = new Set(data.hiddenLineIds)}
	{@const isHidden = !line.id || hiddenLineIds.has(line.id)}
	{@const lineCoords = isHidden ? [] : computeLineCoords(line.id!)}
	{#if lineCoords.length > 1}
		{@const dashAttr = scaleDashPattern(line.dashPattern, line.strokeWidth ?? LINE_WIDTH)}
		<path
			d={createOctilinearPath(lineCoords)}
			fill="none"
			stroke={line.color}
			stroke-width={line.strokeWidth ?? LINE_WIDTH}
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-dasharray={dashAttr}
		/>
	{/if}
{/each}
