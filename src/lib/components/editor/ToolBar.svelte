<script lang="ts">
	import { createDropdownMenu } from '@melt-ui/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';

	import { IconButton, Tooltip, StationSelector } from '$lib/components/ui';

	let {
		onaddstation = () => {},
		onaddanchor = () => {}
	}: {
		onaddstation: () => void;
		onaddanchor: () => void;
	} = $props();

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
		const groups = new Map<string, typeof editorState.lines>();
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
		new Map(editorState.transitTypes.map((t) => [t.id, t.icon ?? 'directions_transit']))
	);
</script>

<div
	class="absolute bottom-4 left-1/2 z-30 flex max-w-[80vw] -translate-x-1/2 items-center gap-2 rounded-full border border-outline/20 bg-surface px-4 py-2 shadow-xl"
>
	<!-- Line selector -->
	<div class="relative flex shrink items-center gap-1">
		<div
			class="h-3 w-3 shrink-0 rounded-full"
			style="background-color: {selectedLineChip?.color || '#ccc'}"
		></div>
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
			<Tooltip text="Deselect (D)">
				<IconButton
					class="!h-6 !w-6 shrink-0"
					onclick={() => {
						editorState.selectedLineId = null;
					}}
				>
					<span class="material-symbols-outlined text-sm">close</span>
				</IconButton>
			</Tooltip>
		{/if}

		<div {...$lineMenuEl} use:lineMenuEl class="m3-menu">
			<div class="m3-menu__search">
				<span class="material-symbols-outlined m3-menu__search-icon">search</span>
				<input
					type="text"
					placeholder="Search lines…"
					bind:value={lineSearch}
					onclick={stopProp}
					onkeydown={stopProp}
					class="m3-menu__search-input"
				/>
			</div>
			<div class="max-h-48 overflow-y-auto">
				{#each filteredLineGroups.groups as [typeName, lines]}
					<div class="m3-menu__group-label">{typeName}</div>
					{#each lines as line}
						<button
							type="button"
							{...$lineItem}
							use:lineItem
							class="m3-menu__item"
							onclick={() => {
								editorState.selectedLineId = line.id!;
							}}
						>
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
					<div class="m3-menu__group-label">Other</div>
					{#each filteredLineGroups.uncategorized as line}
						<button
							type="button"
							{...$lineItem}
							use:lineItem
							class="m3-menu__item"
							onclick={() => {
								editorState.selectedLineId = line.id!;
							}}
						>
							<div
								class="h-3 w-3 shrink-0 rounded-full"
								style="background-color: {line.color}"
							></div>
							<span class="flex-1 truncate">{line.name}</span>
						</button>
					{/each}
				{/if}
				{#if filteredLineGroups.groups.length === 0 && filteredLineGroups.uncategorized.length === 0}
					<div class="m3-menu__empty">No lines found</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="h-5 w-px shrink-0 bg-outline/20"></div>

	<!-- Station selector -->
	<div class="relative flex shrink items-center gap-1">
		<span class="material-symbols-outlined shrink-0 text-sm text-on-surface-variant"
			>location_on</span
		>
		<StationSelector
			selectedId={editorState.selectedStationId}
			label="No station selected"
			onSelect={(id) => {
				editorState.selectedStationId = id;
			}}
		/>
		{#if editorState.selectedStationId !== null}
			<Tooltip text="Deselect station">
				<IconButton
					class="!h-6 !w-6 shrink-0"
					onclick={() => {
						editorState.selectedStationId = null;
					}}
				>
					<span class="material-symbols-outlined text-sm">close</span>
				</IconButton>
			</Tooltip>
		{/if}
	</div>

	<div class="h-5 w-px shrink-0 bg-outline/20"></div>

	<!-- Action buttons -->
	<Tooltip
		text={editorState.placementMode === 'station' ? 'Cancel (Esc)' : `${m.add_station()} (S)`}
	>
		<IconButton
			class="shrink-0 {editorState.placementMode === 'station' ? '!bg-error !text-on-error' : ''}"
			onclick={onaddstation}
		>
			<span class="material-symbols-outlined"
				>{editorState.placementMode === 'station' ? 'close' : 'add'}</span
			>
		</IconButton>
	</Tooltip>

	<Tooltip text={editorState.placementMode === 'anchor' ? 'Cancel (Esc)' : 'Add anchor (A)'}>
		<IconButton
			class="shrink-0 {editorState.placementMode === 'anchor' ? '!bg-error !text-on-error' : ''}"
			onclick={onaddanchor}
		>
			<span class="material-symbols-outlined"
				>{editorState.placementMode === 'anchor' ? 'close' : 'anchor'}</span
			>
		</IconButton>
	</Tooltip>

</div>
