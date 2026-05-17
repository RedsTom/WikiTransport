<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';

	import { TextField, IconButton, Tooltip } from '$lib/components/ui';

	let stationSearch = $state('');

	let filteredStations = $derived(
		editorState.stations.filter(
			(s) => s.id && s.name.toLowerCase().includes(stationSearch.toLowerCase())
		)
	);

	function selectStation(id: number) {
		editorState.setSelection(id);
		editorState.selectedAnchorId = null;
		editorState.rightTab = 'station';
	}
</script>

<div class="mb-2">
	<TextField label={m.search_stations()} bind:value={stationSearch} />
</div>
{#each filteredStations as station (station.id)}
	<div
		class="group mb-1 flex cursor-pointer items-center gap-3 rounded-md p-2.5 transition-colors {editorState.selectedStationId ===
		station.id
			? 'bg-secondary-container text-on-secondary-container'
			: 'hover:bg-surface-variant'}"
		onclick={() => selectStation(station.id!)}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Enter' && selectStation(station.id!)}
	>
		<span class="material-symbols-outlined text-sm">location_on</span>
		<span class="flex-1 truncate text-sm font-medium">{station.name}</span>
		{#if !editorState.isGlobalView}
			<div
				class="opacity-0 transition-opacity group-hover:opacity-100"
				onclick={(e: MouseEvent) => e.stopPropagation()}
				role="none"
			>
				<Tooltip
					text={editorState.effectiveHiddenStationIds.has(station.id!)
						? m.show_line()
						: m.hide_line()}
				>
					<IconButton
						onclick={() => {
							editorState.toggleStationVisibility(station.id!);
						}}
					>
						<span class="material-symbols-outlined text-sm">
							{editorState.effectiveHiddenStationIds.has(station.id!)
								? 'visibility_off'
								: 'visibility'}
						</span>
					</IconButton>
				</Tooltip>
			</div>
		{/if}
	</div>
{/each}
{#if filteredStations.length === 0}
	<div
		class="flex items-center justify-center p-6 text-center text-sm text-on-surface-variant opacity-70"
	>
		{stationSearch ? m.nothing_matches() : m.no_stations_or_anchors()}
	</div>
{/if}
