<script lang="ts">
	import { dndzone, type DndEvent } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { LineService } from '$lib/services/LineService';
	import { TransitTypeService } from '$lib/services/TransitTypeService';
	import { EditorService } from '$lib/services/EditorService';
	import type { Line } from '$lib/types';

	import { Button, IconButton, Tooltip, StationSelector } from '$lib/components/ui';
	import { SvelteSet } from 'svelte/reactivity';
	import { db } from '$lib/services/Database';
	import { StationService } from '$lib/services/StationService';
	import { distToSegment } from '$lib/utils/schematic';
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
		if (collapsedTypes.has(typeId)) collapsedTypes.delete(typeId);
		else collapsedTypes.add(typeId);
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
		const lineId = items[0]?.lineId;
		for (let i = 0; i < items.length; i++) {
			const id = items[i].id;
			if (id === undefined) continue;
			await db.routePoints.update(id, { order: i });
		}
		if (lineId != null && items.length >= 2) {
			const anchors = await db.anchorPoints.where({ lineId }).toArray();
			if (anchors.length > 0) {
				const stationIds: number[] = [];
				for (const item of items) {
					if (item.stationId != null) stationIds.push(item.stationId);
				}
				const segAnchors = new Map<number, typeof anchors>();
				for (const ap of anchors) {
					let bestSeg = -1;
					let bestDist = Infinity;
					for (let i = 0; i < stationIds.length - 1; i++) {
						const stA = editorState.stations.find((s) => s.id === stationIds[i]);
						const stB = editorState.stations.find((s) => s.id === stationIds[i + 1]);
						if (!stA || !stB) continue;
						const dist = distToSegment(
							ap.schematicX,
							ap.schematicY,
							stA.schematicX,
							stA.schematicY,
							stB.schematicX,
							stB.schematicY
						);
						if (dist < bestDist) {
							bestSeg = i;
							bestDist = dist;
						}
					}
					if (bestSeg >= 0) {
						if (!segAnchors.has(bestSeg)) segAnchors.set(bestSeg, []);
						segAnchors.get(bestSeg)!.push(ap);
					}
				}
				for (const [segIdx, group] of segAnchors) {
					group.sort((a, b) => a.order - b.order);
					const n = group.length;
					for (let i = 0; i < n; i++) {
						const newOrder = segIdx + (i + 1) / (n + 1);
						await db.anchorPoints.update(group[i].id!, { order: newOrder });
					}
				}
			}
		}
		await editorState.loadRoutePoints();
		await editorState.loadAnchorPoints(editorState.activeViewId ?? undefined);
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
		editorState.rightTab = 'type';
	}
</script>

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
				<h3 class="truncate text-sm font-bold text-on-surface-variant">{type.name}</h3>
				<span class="shrink-0 text-xs text-on-surface-variant/60">({linesOfType.length})</span>
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
					{@const transitType = editorState.transitTypes.find((t) => t.id === line.transitTypeId)}
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
											text={editorState.effectiveHiddenLineIds.has(line.id!)
												? m.show_line()
												: m.hide_line()}
										>
											<IconButton
												onclick={() => EditorService.toggleLineVisibility(editorState, line.id!)}
											>
												<span class="material-symbols-outlined text-sm">
													{editorState.effectiveHiddenLineIds.has(line.id!)
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
												<span class="material-symbols-outlined text-sm text-on-surface-variant"
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
