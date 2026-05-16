<script lang="ts">
	import type { ExportData } from '$lib/utils/svg-export';
	import ExportLines from './ExportLines.svelte';
	import ExportStations from './ExportStations.svelte';
	import ExportBadges from './ExportBadges.svelte';
	import ExportLegend from './ExportLegend.svelte';

	import type { Point } from '$lib/utils/schematic';

	let {
		data,
		isGlobal,
		bounds,
		legendExt,
		preview,
		renderingData
	}: {
		data: ExportData;
		isGlobal: boolean;
		bounds: { minX: number; minY: number; maxX: number; maxY: number };
		legendExt: {
			bounds: { minX: number; minY: number; maxX: number; maxY: number };
			legendX: number;
			legendY: number;
			legendWidth: number;
			legendHeight: number;
		} | null;
		preview: boolean;
		renderingData: {
			basePaths: Map<number, Point[]>;
			tunnelOffsets: Map<string, Map<number, Point>>;
			stationPoints: Set<string>;
		};
	} = $props();

	const cw = $derived(bounds.maxX - bounds.minX);
	const ch = $derived(bounds.maxY - bounds.minY);

	const svgWidth = $derived.by(() => {
		if (preview) return undefined;
		const aspectRatio = Math.max(cw, 200) / Math.max(ch, 200);
		let w = 1200;
		let h = Math.round(w / aspectRatio);
		if (h > 900) {
			h = 900;
			w = Math.round(h * aspectRatio);
		}
		return w;
	});

	const svgHeight = $derived.by(() => {
		if (preview) return undefined;
		const aspectRatio = Math.max(cw, 200) / Math.max(ch, 200);
		let w = 1200;
		let h = Math.round(w / aspectRatio);
		if (h > 900) {
			h = 900;
		}
		return h;
	});

	const svgStyle = $derived(preview ? 'width:100%;height:100%' : undefined);
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="{bounds.minX} {bounds.minY} {cw} {ch}"
	width={svgWidth}
	height={svgHeight}
	style={svgStyle}
>
	<rect x={bounds.minX} y={bounds.minY} width={cw} height={ch} fill="#f8f8f8" />
	<g id="lines">
		<ExportLines {data} {isGlobal} {renderingData} />
	</g>
	<g id="stations">
		<ExportStations {data} {isGlobal} />
	</g>
	{#if legendExt}
		<ExportLegend
			{data}
			lx={legendExt.legendX}
			ly={legendExt.legendY}
			legendWidth={legendExt.legendWidth}
			legendHeight={legendExt.legendHeight}
		/>
	{/if}
	<g id="interchanges">
		<ExportBadges {data} {isGlobal} />
	</g>
</svg>
