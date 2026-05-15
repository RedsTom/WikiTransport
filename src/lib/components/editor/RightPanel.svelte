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
</script>

<aside class="flex w-80 shrink-0 flex-col border-l border-outline/20 bg-surface">
	<div class="flex h-14 shrink-0 items-center justify-between border-b border-outline/20 px-3">
		<button
			class="m3-icon-button"
			onclick={() => (editorState.rightTab = null)}
		>
			<span class="material-symbols-outlined">chevron_right</span>
		</button>
		<h2 class="text-sm font-bold">
			{#if editorState.rightTab === 'general'}
				{m.general()}
			{:else if editorState.rightTab === 'type'}
				{m.type_heading()}
			{:else if editorState.rightTab === 'line'}
				{m.line()}
			{:else if editorState.rightTab === 'station'}
				{m.station()}
			{/if}
		</h2>
	</div>
	<div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
		{#if editorState.rightTab === 'general'}
			{#if editorState.project}
				<ProjectProperties />
			{/if}
		{:else if editorState.rightTab === 'type' && selectedTransitType}
			<TypeProperties />
		{:else if editorState.rightTab === 'line' && hasLine}
			<LineProperties />
		{:else if editorState.rightTab === 'station' && (hasStation || hasAnchor)}
			<StationProperties />
		{/if}
	</div>
</aside>
