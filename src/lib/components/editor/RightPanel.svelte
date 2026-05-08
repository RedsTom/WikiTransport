<script lang="ts">
	import { editorState } from '$lib/store/editor.svelte';
	import * as m from '$lib/paraglide/messages.js';

	import LineProperties from './LineProperties.svelte';
	import StationProperties from './StationProperties.svelte';
	import TypeProperties from './TypeProperties.svelte';
	import ProjectProperties from './ProjectProperties.svelte';

	let selectedLine = $derived(editorState.lines.find((l) => l.id === editorState.selectedLineId));
	let selectedStation = $derived(
		editorState.stations.find((s) => s.id === editorState.selectedStationId)
	);
	let selectedAnchor = $derived(
		editorState.anchorPoints.find((a) => a.id === editorState.selectedAnchorId)
	);
	let selectedTransitType = $derived(
		editorState.transitTypes.find((t) => t.id === editorState.selectedTransitTypeId)
	);
	let hasLine = $derived(!!selectedLine);
	let hasStation = $derived(!!selectedStation);
	let hasAnchor = $derived(!!selectedAnchor);

	$effect(() => {
		const lineId = editorState.selectedLineId;
		const stationId = editorState.selectedStationId;
		const anchorId = editorState.selectedAnchorId;
		if (anchorId !== null) {
			editorState.rightTab = 'station';
		} else if (lineId !== null && stationId === null) {
			editorState.rightTab = 'line';
		} else if (stationId !== null) {
			editorState.rightTab = 'station';
		} else if (lineId === null && stationId === null) {
			editorState.rightTab = 'general';
		}
	});

	function selectGeneral() {
		editorState.rightTab = 'general';
	}

	function selectLine() {
		editorState.rightTab = 'line';
		editorState.leftTab = 'lines';
	}

	function selectStation() {
		editorState.rightTab = 'station';
		editorState.leftTab = 'stations';
	}
</script>

<aside class="flex w-80 shrink-0 flex-col border-l border-outline/20 bg-surface">
	<div class="flex shrink-0 border-b border-outline/20" role="tablist">
		<button
			role="tab"
			aria-selected={editorState.rightTab === 'general'}
			class="flex-1 px-3 py-2.5 text-sm font-bold whitespace-nowrap transition-colors {editorState.rightTab ===
			'general'
				? 'border-b-2 border-primary text-primary'
				: 'text-on-surface-variant hover:text-on-surface'}"
			onclick={selectGeneral}
		>
			General
		</button>
		<button
			role="tab"
			aria-selected={editorState.rightTab === 'line'}
			disabled={!hasLine}
			class="flex-1 px-3 py-2.5 text-sm font-bold whitespace-nowrap transition-colors {editorState.rightTab ===
			'line'
				? 'border-b-2 border-primary text-primary'
				: hasLine
					? 'text-on-surface-variant hover:text-on-surface'
					: 'cursor-default text-outline'}"
			onclick={selectLine}
		>
			{m.lines()}
		</button>
		<button
			role="tab"
			aria-selected={editorState.rightTab === 'station'}
			disabled={!hasStation}
			class="flex-1 px-3 py-2.5 text-sm font-bold whitespace-nowrap transition-colors {editorState.rightTab ===
			'station'
				? 'border-b-2 border-primary text-primary'
				: hasStation
					? 'text-on-surface-variant hover:text-on-surface'
					: 'cursor-default text-outline'}"
			onclick={selectStation}
		>
			{m.stations()}
		</button>
	</div>

	<div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
		{#if editorState.rightTab === 'general'}
			{#if editorState.project}
				<ProjectProperties />
			{/if}
			{#if selectedTransitType}
				<TypeProperties />
			{/if}
		{:else if editorState.rightTab === 'line' && hasLine}
			<LineProperties />
		{:else if editorState.rightTab === 'station' && (hasStation || hasAnchor)}
			<StationProperties />
		{/if}
	</div>
</aside>
