<script lang="ts">
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { LineService } from '$lib/services/LineService';
	import { TransitTypeService } from '$lib/services/TransitTypeService';
	import { EditorService } from '$lib/services/EditorService';
	import type { Line } from '$lib/types';

	import { Button, IconButton, TextField, Tooltip, StationSelector } from '$lib/components/ui';
	import { SvelteSet } from 'svelte/reactivity';
	/* eslint-disable svelte/no-unnecessary-state-wrap */
	import { db } from '$lib/services/Database';
	import { StationService } from '$lib/services/StationService';
	import type { RoutePoint } from '$lib/types';

	const flipDurationMs = 200;

	type DndItem = RoutePoint & { stationName: string };
	let stationDndItems = $state<Record<number, DndItem[]>>({});
	let isDraggingStation = $state(false);

	let lineStationsMap = $derived.by(() => {
		const map: Record<number, DndItem[]> = {};
		for (const rp of editorState.routePoints) {
			if (!map[rp.lineId]) map[rp.lineId] = [];
			const st = editorState.stations.find((s) => s.id === rp.stationId);
			map[rp.lineId].push({ ...rp, stationName: st?.name || m.unknown_station() });
		}
		for (const key of Object.keys(map)) {
			map[Number(key)].sort((a, b) => a.order - b.order);
		}
		return map;
	});

	$effect(() => {
		if (isDraggingStation) return;
		stationDndItems = lineStationsMap;
	});

	let collapsedTypes = $state(new SvelteSet<number>());
	let collapsedLines = $state(new SvelteSet<number>());

	function toggleCollapse(typeId: number) {
		if (collapsedTypes.has(typeId)) {
			collapsedTypes.delete(typeId);
		} else {
			collapsedTypes.add(typeId);
		}
	}

	async function removeStationFromLine(rpId: number) {
		await db.routePoints.delete(rpId);
		await editorState.loadRoutePoints();
	}

	async function addStationToLine(lineId: number, stationId: number) {
		const rps = editorState.routePoints.filter((rp) => rp.lineId === lineId);
		const maxOrder = rps.length > 0 ? Math.max(...rps.map((rp) => rp.order)) : 0;
		await StationService.addStationToLine(lineId, stationId, maxOrder + 1);
		await editorState.loadRoutePoints();
	}

	async function handleAddLine(typeId: number) {
		if (editorState.project?.id) {
			const newLineId = await LineService.createLine(
				editorState.project.id,
				typeId,
				`${m.lines()} ${editorState.lines.length + 1}`
			);
			await editorState.loadLines();
			editorState.selectedLineId = newLineId;
			editorState.selectedStationId = null;
			editorState.selectedTransitTypeId = null;
		}
	}

	async function handleAddType() {
		if (editorState.project?.id) {
			const newTypeId = await TransitTypeService.createType(editorState.project.id, m.new_type());
			await editorState.loadTransitTypes();
			editorState.selectedTransitTypeId = newTypeId;
			editorState.selectedLineId = null;
			editorState.selectedStationId = null;
		}
	}

	function handleStationDndConsider(e: CustomEvent<DndEvent<DndItem>>) {
		isDraggingStation = true;
		const items = e.detail.items;
		const lineId = items[0]?.lineId;
		if (lineId != null) {
			stationDndItems[lineId] = items;
		}
	}

	async function handleStationDndFinalize(e: CustomEvent<DndEvent<DndItem>>) {
		const items = e.detail.items;
		for (let i = 0; i < items.length; i++) {
			await db.routePoints.update(items[i].id, { order: i });
		}
		await editorState.loadRoutePoints();
		isDraggingStation = false;
	}

	async function changeLineType(line: Line, newTypeId: number) {
		if (newTypeId === line.transitTypeId) return;
		await LineService.updateLine(line.id!, { transitTypeId: newTypeId });
		await editorState.loadLines();
	}

	function toggleLineCollapse(id: number) {
		if (collapsedLines.has(id)) collapsedLines.delete(id);
		else collapsedLines.add(id);
	}

	function selectLine(id: number) {
		editorState.selectedLineId = id;
		editorState.selectedTransitTypeId = null;
		editorState.rightTab = 'line';
	}

	function selectStationOnLine(stationId: number, lineId: number) {
		editorState.selectedLineId = lineId;
		editorState.selectedStationId = stationId;
		editorState.selectedAnchorId = null;
		editorState.rightTab = 'station';
	}

	function selectType(id: number) {
		editorState.selectedTransitTypeId = id;
		editorState.selectedLineId = null;
		editorState.selectedStationId = null;
	}

	function selectStation(id: number) {
		editorState.selectedStationId = id;
		editorState.selectedAnchorId = null;
		editorState.rightTab = 'station';
	}

	function selectAnchor(id: number) {
		editorState.selectedAnchorId = id;
		editorState.selectedStationId = null;
		editorState.rightTab = 'station';
	}

	const tabDefs = [
		{ key: 'lines', label: m.lines() },
		{ key: 'types', label: m.line_types() },
		{ key: 'stations', label: m.stations() }
	] as const;

	let stationSearch = $state('');

	type ListEntry =
		| { kind: 'station'; id: number; name: string }
		| { kind: 'anchor'; id: number; label: string };
	let allEntries = $derived.by((): ListEntry[] => {
		const q = stationSearch.toLowerCase();
		const result: ListEntry[] = [];
		for (const s of editorState.stations) {
			if (s.id && s.name.toLowerCase().includes(q)) {
				result.push({ kind: 'station', id: s.id, name: s.name });
			}
		}
		for (const a of editorState.anchorPoints) {
			if (a.id) {
				const label = `${m.anchor()} #${a.id}`;
				if (label.toLowerCase().includes(q) || !q) {
					result.push({ kind: 'anchor', id: a.id, label });
				}
			}
		}
		return result;
	});
</script>

<aside class="flex w-80 shrink-0 flex-col overflow-hidden border-r border-outline/20 bg-surface">
	<div class="flex shrink-0 border-b border-outline/20" role="tablist">
		{#each tabDefs as tab (tab.key)}
			<button
				role="tab"
				aria-selected={editorState.leftTab === tab.key}
				class="flex-1 shrink-0 px-3 py-2.5 text-sm font-bold whitespace-nowrap transition-colors {editorState.leftTab ===
				tab.key
					? 'border-b-2 border-primary text-primary'
					: 'text-on-surface-variant hover:text-on-surface'}"
				onclick={() => (editorState.leftTab = tab.key)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto p-2">
		{#if editorState.leftTab === 'lines'}
			{#if editorState.transitTypes.length === 0}
				<div
					class="flex items-center justify-center p-6 text-center text-sm text-on-surface-variant opacity-70"
				>
					{m.create_line_type_first()}
				</div>
			{/if}

			{#each editorState.transitTypes as type (type.id)}
				{@const linesOfType = editorState.lines
					.filter((l) => l.transitTypeId === type.id)
					.sort((a, b) => a.name.localeCompare(b.name))}
				{@const isCollapsed = collapsedTypes.has(type.id!)}

				<div class="mb-2">
					<div
						class="mb-1 flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-1.5 transition-colors {editorState.selectedTransitTypeId ===
						type.id
							? 'bg-secondary-container text-on-secondary-container'
							: 'hover:bg-surface-variant'}"
						onclick={() => selectType(type.id!)}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && selectType(type.id!)}
						ondragover={(e) => e.preventDefault()}
						ondrop={async (e) => {
							e.preventDefault();
							const lineId = Number(e.dataTransfer?.getData('text/plain'));
							if (lineId && lineId !== type.id) {
								const line = editorState.lines.find((l) => l.id === lineId);
								if (line && line.transitTypeId !== type.id) {
									await changeLineType(line, type.id!);
								}
							}
						}}
					>
						<div class="flex min-w-0 flex-1 items-center gap-2">
							<span
								class="material-symbols-outlined text-sm text-on-surface-variant"
								role="button"
								tabindex="0"
								onclick={(e: MouseEvent) => {
									e.stopPropagation();
									toggleCollapse(type.id!);
								}}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Enter') {
										e.stopPropagation();
										toggleCollapse(type.id!);
									}
								}}
							>
								{isCollapsed ? 'chevron_right' : 'expand_more'}
							</span>
							{#if type.icon}
								<span class="material-symbols-outlined text-base text-on-surface-variant"
									>{type.icon}</span
								>
							{/if}
							<h3 class="truncate text-sm font-bold text-on-surface-variant">
								{type.name}
							</h3>
							<span class="shrink-0 text-xs text-on-surface-variant/60">({linesOfType.length})</span
							>
						</div>
						<div
							class="flex items-center gap-0.5"
							role="none"
							onclick={(e: MouseEvent) => e.stopPropagation()}
						>
							<IconButton onclick={() => handleAddLine(type.id!)}>
								<span class="material-symbols-outlined text-sm">add</span>
							</IconButton>
						</div>
					</div>

					{#if !isCollapsed}
						<div class="flex flex-col gap-0.5">
							{#each linesOfType as line (line.id)}
								{@const isSelected = editorState.selectedLineId === line.id}
								{@const transitType = editorState.transitTypes.find(
									(t) => t.id === line.transitTypeId
								)}
								{@const isLineExpanded = collapsedLines.has(line.id!)}
								{@const lineRps = [...editorState.routePoints]
									.filter((rp) => rp.lineId === line.id)
									.sort((a, b) => a.order - b.order)}
								<div class="flex flex-col gap-0.5">
									<div
										class="group flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1.5 transition-colors {isSelected
											? 'bg-secondary-container text-on-secondary-container'
											: 'hover:bg-surface-variant'}"
										onclick={() => selectLine(line.id!)}
										role="button"
										tabindex="0"
										onkeydown={(e) => e.key === 'Enter' && selectLine(line.id!)}
										draggable="true"
										ondragstart={(e) => {
											e.dataTransfer?.setData('text/plain', String(line.id!));
										}}
									>
										<span
											class="material-symbols-outlined text-sm text-on-surface-variant"
											role="button"
											tabindex="0"
											onclick={(e: MouseEvent) => {
												e.stopPropagation();
												toggleLineCollapse(line.id!);
											}}
											onkeydown={(e: KeyboardEvent) => {
												if (e.key === 'Enter') {
													e.stopPropagation();
													toggleLineCollapse(line.id!);
												}
											}}
										>
											{isLineExpanded ? 'expand_more' : 'chevron_right'}
										</span>
										<div
											class="h-4 w-4 shrink-0 border border-outline/20"
											style="background-color: {line.color}; border-radius: {transitType?.iconShape ===
											'square'
												? '4px'
												: transitType?.iconShape === 'circle'
													? '50%'
													: '8px'}; transform: {transitType?.iconShape === 'diamond'
												? 'rotate(45deg)'
												: 'none'};"
										></div>
										<span class="flex-1 truncate text-sm font-medium">{line.name}</span>
										<div
											class="opacity-0 transition-opacity group-hover:opacity-100"
											onclick={(e: MouseEvent) => e.stopPropagation()}
											role="none"
										>
											<div class="flex items-center gap-0.5">
												{#if !editorState.isGlobalView}
													<Tooltip
														text={editorState.hiddenLineIds.has(line.id!)
															? m.show_line()
															: m.hide_line()}
													>
														<IconButton
															onclick={() =>
																EditorService.toggleLineVisibility(editorState, line.id!)}
														>
															<span class="material-symbols-outlined text-sm">
																{editorState.hiddenLineIds.has(line.id!)
																	? 'visibility_off'
																	: 'visibility'}
															</span>
														</IconButton>
													</Tooltip>
												{/if}
												<select
													value={line.transitTypeId}
													onchange={(e: Event) =>
														changeLineType(line, Number((e.target as HTMLSelectElement).value))}
													onclick={(e: MouseEvent) => e.stopPropagation()}
													class="w-20 rounded-md border border-outline/20 bg-transparent px-1.5 py-0.5 text-xs"
												>
													{#each editorState.transitTypes as t (t.id)}
														<option value={t.id}>{t.name}</option>
													{/each}
												</select>
											</div>
										</div>
									</div>
									{#if isLineExpanded}
										<div class="ml-2 flex flex-col gap-0.5 border-l-2 border-outline/10 pl-2">
											{#if stationDndItems[line.id!]}
												<div
													use:dndzone={{ items: stationDndItems[line.id!], flipDurationMs }}
													onconsider={handleStationDndConsider}
													onfinalize={handleStationDndFinalize}
													class="flex flex-col gap-0.5"
												>
													{#each stationDndItems[line.id!] as rp (rp.id)}
														{@const st = editorState.stations.find((s) => s.id === rp.stationId)}
														{@const isStationSelected =
															editorState.selectedStationId === rp.stationId &&
															editorState.selectedLineId === line.id}
														<div
															animate:flip={{ duration: flipDurationMs }}
															class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors {isStationSelected
																? 'bg-secondary-container text-on-secondary-container'
																: 'hover:bg-surface-variant'}"
															onclick={() => selectStationOnLine(rp.stationId, line.id!)}
															role="button"
															tabindex="0"
															onkeydown={(e) =>
																e.key === 'Enter' && selectStationOnLine(rp.stationId, line.id!)}
														>
															<span
																class="material-symbols-outlined text-sm text-on-surface-variant"
																>location_on</span
															>
															<span class="flex-1 truncate">{st?.name || m.unknown_station()}</span>
															<div onclick={(e: MouseEvent) => e.stopPropagation()} role="none">
																<IconButton
																	class="!h-6 !w-6"
																	onclick={() => rp.id && removeStationFromLine(rp.id)}
																>
																	<span class="material-symbols-outlined text-sm">remove</span>
																</IconButton>
															</div>
														</div>
													{/each}
												</div>
											{/if}
											<div class="w-full px-1 pt-0.5">
												<StationSelector
													label={m.add_station()}
													variant="outlined"
													class="w-full"
													includeIcon={true}
													excludeIds={lineRps
														.map((rp) => rp.stationId)
														.filter((id): id is number => id != null)}
													onSelect={(id: number) => addStationToLine(line.id!, id)}
												/>
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		{:else if editorState.leftTab === 'types'}
			<div class="mb-2 flex justify-end">
				<Button variant="filled" onclick={handleAddType}>
					<span class="material-symbols-outlined">add</span>
					{m.new_type()}
				</Button>
			</div>

			{#each editorState.transitTypes as type (type.id)}
				<div
					class="mb-1 flex cursor-pointer items-center gap-3 rounded-md p-2.5 transition-colors {editorState.selectedTransitTypeId ===
					type.id
						? 'bg-secondary-container text-on-secondary-container'
						: 'hover:bg-surface-variant'}"
					onclick={() => selectType(type.id!)}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && selectType(type.id!)}
				>
					{#if type.icon}
						<span class="material-symbols-outlined text-base text-on-surface-variant"
							>{type.icon}</span
						>
					{/if}
					<span class="flex-1 truncate text-sm font-medium">{type.name}</span>
				</div>
			{/each}
		{:else if editorState.leftTab === 'stations'}
			<div class="mb-2">
				<TextField label={m.search_stations()} bind:value={stationSearch} />
			</div>
			{#each allEntries as entry (entry.id)}
				{#if entry.kind === 'station'}
					<div
						class="group mb-1 flex cursor-pointer items-center gap-3 rounded-md p-2.5 transition-colors {editorState.selectedStationId ===
						entry.id
							? 'bg-secondary-container text-on-secondary-container'
							: 'hover:bg-surface-variant'}"
						onclick={() => selectStation(entry.id)}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && selectStation(entry.id)}
					>
						<span class="material-symbols-outlined text-sm">location_on</span>
						<span class="flex-1 truncate text-sm font-medium">{entry.name}</span>
						{#if !editorState.isGlobalView}
							<div
								class="opacity-0 transition-opacity group-hover:opacity-100"
								onclick={(e: MouseEvent) => {
									e.stopPropagation();
									editorState.toggleStationVisibility(entry.id);
								}}
								role="none"
							>
								<span class="material-symbols-outlined text-sm text-on-surface-variant">
									{editorState.effectiveHiddenStationIds.has(entry.id)
										? 'visibility_off'
										: 'visibility'}
								</span>
							</div>
						{/if}
					</div>
				{:else}
					<div
						class="mb-1 flex cursor-pointer items-center gap-3 rounded-md p-2.5 transition-colors {editorState.selectedAnchorId ===
						entry.id
							? 'bg-secondary-container text-on-secondary-container'
							: 'hover:bg-surface-variant'}"
						onclick={() => selectAnchor(entry.id)}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && selectAnchor(entry.id)}
					>
						<span class="material-symbols-outlined text-sm">anchor</span>
						<span class="flex-1 truncate text-sm font-medium">{entry.label}</span>
					</div>
				{/if}
			{/each}
			{#if allEntries.length === 0}
				<div
					class="flex items-center justify-center p-6 text-center text-sm text-on-surface-variant opacity-70"
				>
					{stationSearch ? m.nothing_matches() : m.no_stations_or_anchors()}
				</div>
			{/if}
		{/if}
	</div>
</aside>
