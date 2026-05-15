<script lang="ts">
	import { createDropdownMenu } from '@melt-ui/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { StationService } from '$lib/services/StationService';
	import { SvelteMap } from 'svelte/reactivity';

	import { IconButton, Tooltip, StationSelector, ModeButton } from '$lib/components/ui';

	let {
		onaddstation = () => {},
		onaddanchor = () => {}
	}: {
		onaddstation: () => void;
		onaddanchor: () => void;
	} = $props();

	let stationOnLine = $derived(
		editorState.selectedLineId !== null &&
			editorState.selectedStationId !== null &&
			editorState.routePoints.some(
				(rp) =>
					rp.lineId === editorState.selectedLineId && rp.stationId === editorState.selectedStationId
			)
	);

	let addToLineVisible = $derived(
		editorState.selectedLineId !== null && editorState.selectedStationId !== null && !stationOnLine
	);

	let beforeAfterVisible = $derived(
		editorState.selectedLineId !== null && editorState.selectedStationId !== null && stationOnLine
	);

	async function handleAddToLine() {
		if (editorState.selectedLineId === null || editorState.selectedStationId === null) return;
		const existing = editorState.routePoints.filter(
			(rp) => rp.lineId === editorState.selectedLineId
		);
		const maxOrder = existing.length > 0 ? Math.max(...existing.map((rp) => rp.order)) : 0;
		await StationService.addStationToLine(
			editorState.selectedLineId,
			editorState.selectedStationId,
			maxOrder + 1
		);
		await editorState.loadRoutePoints();
	}

	function startAddPlacement(before: boolean) {
		if (editorState.selectedLineId === null || editorState.selectedStationId === null) return;
		const rp = editorState.routePoints.find(
			(r) =>
				r.lineId === editorState.selectedLineId && r.stationId === editorState.selectedStationId
		);
		if (!rp) return;
		editorState.pendingLineInsert = { refStationId: editorState.selectedStationId, before };
		editorState.placementMode = 'station';
	}

	function handleStationShortcut(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		if (target.matches('input, textarea, select, [contenteditable]')) return;
		if (e.key === 's' || e.key === 'S') {
			e.preventDefault();
			if (editorState.placementMode === 'station') {
				editorState.placementMode = null;
				editorState.pendingLineInsert = null;
			} else if (beforeAfterVisible) {
				if (e.shiftKey) {
					startAddPlacement(true);
				} else {
					startAddPlacement(false);
				}
			} else {
				editorState.placementMode = 'station';
			}
		}
	}

	const {
		elements: { trigger: lineTrigger, menu: lineMenuEl, item: lineItem }
	} = createDropdownMenu({
		positioning: { placement: 'top-start' }
	});

	let selectedLineChip = $derived(
		editorState.lines.find((l) => l.id === editorState.selectedLineId)
	);

	let lineSearch = $state('');

	function stopProp(e: Event) {
		e.stopPropagation();
	}

	let linesByType = $derived.by(() => {
		const groups = new SvelteMap<string, typeof editorState.lines>();
		const uncategorized: typeof editorState.lines = [];
		const sorted = [...editorState.lines].sort((a, b) => a.name.localeCompare(b.name));
		for (const line of sorted) {
			const type =
				line.transitTypeId != null
					? editorState.transitTypes.find((t) => t.id === line.transitTypeId)
					: null;
			if (type) {
				const key = type.name;
				if (!groups.has(key)) groups.set(key, []);
				groups.get(key)!.push(line);
			} else {
				uncategorized.push(line);
			}
		}
		return {
			groups: [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)),
			uncategorized
		};
	});

	let filteredLineGroups = $derived.by(() => {
		const q = lineSearch.toLowerCase();
		if (!q) return linesByType;
		const groups: [string, typeof editorState.lines][] = [];
		for (const [name, lines] of linesByType.groups) {
			const fl = lines.filter((l) => l.name.toLowerCase().includes(q));
			if (fl.length) groups.push([name, fl]);
		}
		return {
			groups,
			uncategorized: linesByType.uncategorized.filter((l) => l.name.toLowerCase().includes(q))
		};
	});

	const typeIconMap = $derived(
		new SvelteMap(editorState.transitTypes.map((t) => [t.id, t.icon ?? 'directions_transit']))
	);
</script>

<svelte:window onkeydown={handleStationShortcut} />

<div
	class="absolute bottom-4 left-1/2 z-30 flex max-w-[80vw] -translate-x-1/2 items-center gap-2 rounded-full border border-outline/20 bg-surface px-4 py-2 shadow-xl"
>
	<!-- Line selector -->
	<div class="relative flex shrink items-center gap-1">
		<div
			class="h-3 w-3 shrink-0 rounded-full"
			style="background-color: {selectedLineChip?.color || '#ccc'}"
		></div>
		<!-- eslint-disable-next-line svelte/require-store-reactive-access -->
		<button
			type="button"
			{...$lineTrigger}
			use:lineTrigger
			class="m3-button m3-button--text max-w-[12rem] truncate"
		>
			{selectedLineChip?.name || m.no_line_selected()}
			<span class="material-symbols-outlined ml-1 shrink-0 text-sm">unfold_more</span>
		</button>
		{#if selectedLineChip}
			<Tooltip text={`${m.deselect_line()} (D)`}>
				<IconButton
					class="shrink-0"
					onclick={() => {
						editorState.selectedLineId = null;
					}}
				>
					<span class="material-symbols-outlined text-sm">close</span>
				</IconButton>
			</Tooltip>
		{/if}

		<!-- eslint-disable-next-line svelte/require-store-reactive-access -->
		<div {...$lineMenuEl} use:lineMenuEl class="m3-menu">
			<div class="m3-menu__search">
				<span class="material-symbols-outlined m3-menu__search-icon">search</span>
				<input
					type="text"
					placeholder={m.search_lines()}
					bind:value={lineSearch}
					onclick={stopProp}
					onkeydown={stopProp}
					class="m3-menu__search-input"
				/>
			</div>
			<div class="max-h-48 overflow-y-auto">
				{#each filteredLineGroups.groups as [typeName, lines] (typeName)}
					<div class="m3-menu__group-label">{typeName}</div>
					{#each lines as line (line.id)}
						<!-- eslint-disable-next-line svelte/require-store-reactive-access -->
						<button type="button" {...$lineItem} use:lineItem class="m3-menu__item">
							<div
								class="h-3 w-3 shrink-0 rounded-full"
								style="background-color: {line.color}"
							></div>
							<span class="flex-1 truncate">{line.name}</span>
							{#if line.transitTypeId != null && typeIconMap.has(line.transitTypeId)}
								<span class="material-symbols-outlined ml-auto text-sm text-on-surface-variant"
									>{typeIconMap.get(line.transitTypeId!)}</span
								>
							{/if}
						</button>
					{/each}
				{/each}
				{#if filteredLineGroups.uncategorized.length}
					<div class="m3-menu__group-label">{m.other_lines()}</div>
					{#each filteredLineGroups.uncategorized as line (line.id)}
						<!-- eslint-disable-next-line svelte/require-store-reactive-access -->
						<button type="button" {...$lineItem} use:lineItem class="m3-menu__item">
							<div
								class="h-3 w-3 shrink-0 rounded-full"
								style="background-color: {line.color}"
							></div>
							<span class="flex-1 truncate">{line.name}</span>
						</button>
					{/each}
				{/if}
				{#if filteredLineGroups.groups.length === 0 && filteredLineGroups.uncategorized.length === 0}
					<div class="m3-menu__empty">{m.no_lines_found()}</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="h-5 w-px shrink-0 bg-outline/40"></div>

	<!-- Station selector -->
	<div class="relative flex shrink items-center gap-1">
		<span class="material-symbols-outlined shrink-0 text-sm text-on-surface-variant"
			>location_on</span
		>
		<StationSelector
			selectedId={editorState.selectedStationId}
			label={m.no_station_selected()}
			onSelect={(id) => {
				editorState.selectedStationId = id;
			}}
			includeIcon={false}
		/>
		{#if editorState.selectedStationId !== null}
			<Tooltip text={m.deselect_station()}>
				<IconButton
					class="shrink-0"
					onclick={() => {
						editorState.selectedStationId = null;
					}}
				>
					<span class="material-symbols-outlined text-sm">close</span>
				</IconButton>
			</Tooltip>
		{/if}
	</div>

	<div class="h-5 w-px shrink-0 bg-outline/40"></div>

	<!-- Action buttons -->
	{#if addToLineVisible}
		<Tooltip text={m.add_station_to_line()}>
			<IconButton class="shrink-0 !text-primary" onclick={handleAddToLine}>
				<span class="material-symbols-outlined text-sm">add_circle</span>
			</IconButton>
		</Tooltip>
	{:else if beforeAfterVisible}
		<ModeButton
			active={editorState.placementMode === 'station' &&
				editorState.pendingLineInsert?.before === true}
			inactiveIcon="new_label"
			iconStyle="transform: scaleX(-1)"
			tooltipInactive={`${m.add_station_before()} (⇧+S)`}
			tooltipActive={`${m.cancel()} (Esc)`}
			onactive={() => startAddPlacement(true)}
			oninactive={() => {
				editorState.placementMode = null;
				editorState.pendingLineInsert = null;
			}}
		/>
		<ModeButton
			active={editorState.placementMode === 'station' &&
				editorState.pendingLineInsert?.before === false}
			inactiveIcon="new_label"
			tooltipInactive={`${m.add_station_after()} (S)`}
			tooltipActive={`${m.cancel()} (Esc)`}
			onactive={() => startAddPlacement(false)}
			oninactive={() => {
				editorState.placementMode = null;
				editorState.pendingLineInsert = null;
			}}
		/>
	{:else}
		<ModeButton
			active={editorState.placementMode === 'station'}
			inactiveIcon="add_location"
			tooltipInactive={`${m.add_station()} (S)`}
			tooltipActive={`${m.cancel()} (Esc)`}
			onactive={onaddstation}
			oninactive={() => {
				editorState.placementMode = null;
				editorState.pendingLineInsert = null;
			}}
		/>
	{/if}

	<ModeButton
		active={editorState.placementMode === 'anchor'}
		inactiveIcon="anchor"
		tooltipInactive={`${m.add_anchor()} (A)`}
		tooltipActive={`${m.cancel()} (Esc)`}
		onactive={onaddanchor}
		oninactive={() => {
			editorState.placementMode = null;
			editorState.pendingLineInsert = null;
		}}
	/>
</div>
