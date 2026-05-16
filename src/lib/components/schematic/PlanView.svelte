<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { EditorService } from '$lib/services/EditorService';
	import { StationService } from '$lib/services/StationService';
	import { AnchorPointService } from '$lib/services/AnchorPointService';
	import { ContextMenu, CircularProgress } from '$lib/components/ui';
	import type { ContextMenuItem } from '$lib/components/ui/ContextMenu.svelte';
	import { onMount } from 'svelte';
	import {
		screenToSvg,
		screenToSvgRaw,
		distToSegment,
		closestPointOnSegment,
		buildSegmentTopology,
		computeLineOffsets
	} from '$lib/utils/schematic';
	import { useViewport } from '$lib/utils/useViewport.svelte';
	import SchematicGrid from './SchematicGrid.svelte';
	import SchematicLines from './SchematicLines.svelte';
	import SchematicStations from './SchematicStations.svelte';
	import SchematicAnchors from './SchematicAnchors.svelte';

	let svgEl = $state<SVGSVGElement | null>(null);
	let viewport = useViewport(() => svgEl);

	let draggedStationId = $state<number | null>(null);
	let draggedAnchorId = $state<number | null>(null);
	let didDragStation = false;
	let dragStartScreenX = 0;
	let dragStartScreenY = 0;

	let ctxMenu = $state<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

	onMount(() => {
		requestAnimationFrame(() => viewport.fitContent());
	});

	function handleMouseDown(e: MouseEvent) {
		const target = e.target as SVGElement;

		if (editorState.placementMode === 'station') {
			placeStationAtClick(e);
			return;
		}

		if (editorState.placementMode === 'anchor') {
			placeAnchorAtClick(e);
			return;
		}

		if (target.tagName === 'circle') return;
		if (target.tagName === 'polygon' && target.closest('[data-anchor-id]')) return;

		if (target.tagName === 'path' && target.closest('[data-line]')) {
			const lineEl = target.closest('[data-line]') as SVGElement;
			const lineId = Number(lineEl.getAttribute('data-line'));
			editorState.selectedLineId = lineId;
			editorState.selectedStationId = null;
			editorState.selectedAnchorId = null;
			editorState.selectedTransitTypeId = null;
			editorState.rightTab = 'line';
			return;
		}

		viewport.startPan(e.clientX, e.clientY);
	}

	function startDragAnchor(e: MouseEvent, id: number) {
		if (editorState.placementMode) return;
		e.stopPropagation();
		draggedAnchorId = id;
		editorState.selectedAnchorId = id;
		editorState.selectedStationId = null;
		editorState.selectedTransitTypeId = null;
	}

	async function placeAnchorAtClick(e: MouseEvent) {
		const svg = e.currentTarget as SVGSVGElement;
		const pos = screenToSvgRaw(e, svg);
		const target = e.target as SVGElement;
		const lineEl = target.closest('[data-line]');
		let lineId: number | null = null;
		if (lineEl) {
			lineId = Number(lineEl.getAttribute('data-line'));
		}

		const hiddenLineIds = editorState.effectiveHiddenLineIds;
		const lines = lineId
			? editorState.lines.filter((l) => l.id === lineId)
			: editorState.lines.filter((l) => l.id && !hiddenLineIds.has(l.id));

		let best: { lineId: number; dist: number; order: number; cx: number; cy: number } | null = null;

		for (const line of lines) {
			if (!line.id || hiddenLineIds.has(line.id)) continue;
			const rps = editorState.routePointsByLine.get(line.id) ?? [];
			if (rps.length < 2) continue;
			for (let i = 0; i < rps.length - 1; i++) {
				const sA = editorState.stationMap.get(rps[i].stationId);
				const sB = editorState.stationMap.get(rps[i + 1].stationId);
				if (!sA || !sB) continue;
				const pA = editorState.stationPosition(sA);
				const pB = editorState.stationPosition(sB);
				const dist = distToSegment(pos.x, pos.y, pA.x, pA.y, pB.x, pB.y);
				if (!best || dist < best.dist) {
					const cp = closestPointOnSegment(pos.x, pos.y, pA.x, pA.y, pB.x, pB.y);
					best = {
						lineId: line.id,
						dist,
						order: (rps[i].order + rps[i + 1].order) / 2,
						cx: cp.x,
						cy: cp.y
					};
				}
			}
		}

		if (!best || best.dist > 60) return;

		await AnchorPointService.create(
			best.lineId,
			best.cx,
			best.cy,
			best.order,
			editorState.activeViewId ?? undefined
		);
		await editorState.loadAnchorPoints(editorState.activeViewId ?? undefined);
	}

	async function placeStationAtClick(e: MouseEvent) {
		if (!editorState.project?.id) return;
		const pos = screenToSvg(e, e.currentTarget as SVGSVGElement);
		const stationId = await StationService.createStation(
			editorState.project.id,
			m.new_station({ n: editorState.stations.length + 1 }),
			0,
			0,
			pos.x,
			pos.y
		);
		const pending = editorState.pendingLineInsert;
		if (pending) {
			const rp = editorState.routePoints.find(
				(r) => r.lineId === editorState.selectedLineId && r.stationId === pending.refStationId
			);
			if (editorState.selectedLineId !== null && rp) {
				await StationService.addStationToLine(
					editorState.selectedLineId,
					stationId,
					rp.order + (pending.before ? -0.5 : 0.5)
				);
			}
			editorState.pendingLineInsert = null;
		} else if (editorState.selectedLineId !== null) {
			const existingPoints = editorState.routePoints.filter(
				(rp) => rp.lineId === editorState.selectedLineId
			);
			const maxOrder =
				existingPoints.length > 0 ? Math.max(...existingPoints.map((rp) => rp.order)) : 0;
			await StationService.addStationToLine(editorState.selectedLineId, stationId, maxOrder + 1);
		}
		await editorState.loadStations();
		await editorState.loadRoutePoints();
		editorState.selectedStationId = stationId;
		editorState.rightTab = 'station';
		editorState.placementMode = null;
	}

	function buildStationContextMenu(stationId: number): ContextMenuItem[] {
		const items: ContextMenuItem[] = [
			{
				label: m.edit_station(),
				icon: 'edit',
				action: () => {
					editorState.selectedStationId = stationId;
					editorState.rightTab = 'station';
				}
			},
			{
				label: m.delete_station(),
				icon: 'delete',
				action: () => {
					editorState.stationToDelete = stationId;
					editorState.deleteStationOpen = true;
				}
			},
			{ separator: true, label: '', action: () => {} }
		];

		for (const line of editorState.lines) {
			const alreadyOnLine = (editorState.routePointsByStation.get(stationId) ?? []).some(
				(rp) => rp.lineId === line.id
			);
			if (!alreadyOnLine) {
				items.push({
					label: m.add_to_line({ lineName: line.name }),
					action: async () => {
						const rps = editorState.routePointsByLine.get(line.id!) ?? [];
						const maxOrder = rps.reduce((max, rp) => Math.max(max, rp.order), 0);
						await StationService.addStationToLine(line.id!, stationId, maxOrder + 1);
						await editorState.loadRoutePoints();
					}
				});
			}
		}
		return items;
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
		const target = e.target as SVGElement;

		if (target.tagName === 'polygon' && target.closest('[data-anchor-id]')) {
			const anchorId = Number(target.getAttribute('data-anchor-id'));
			const anchor = editorState.anchorPoints.find((a) => a.id === anchorId);
			if (!anchor) return;
			editorState.selectedAnchorId = anchorId;
			editorState.selectedStationId = null;
			ctxMenu = {
				x: e.clientX,
				y: e.clientY,
				items: [
					{
						label: m.edit_anchor(),
						icon: 'edit',
						action: () => {
							editorState.selectedAnchorId = anchorId;
						}
					},
					{ separator: true, label: '', action: () => {} },
					{
						label: m.delete_anchor(),
						icon: 'delete',
						action: () => {
							editorState.anchorToDelete = anchorId;
							editorState.deleteAnchorOpen = true;
						}
					}
				]
			};
			return;
		}

		if (target.tagName === 'circle') {
			const stationId = Number(target.getAttribute('data-station-id'));
			const station = editorState.stations.find((s) => s.id === stationId);
			if (!station) return;
			ctxMenu = { x: e.clientX, y: e.clientY, items: buildStationContextMenu(stationId) };
		} else if (target.tagName === 'path' && target.closest('[data-line]')) {
			const lineEl = target.closest('[data-line]') as SVGElement;
			const lineId = Number(lineEl.getAttribute('data-line'));
			editorState.selectedLineId = lineId;
			editorState.rightTab = 'line';
			ctxMenu = {
				x: e.clientX,
				y: e.clientY,
				items: [
					{ label: m.edit_line(), icon: 'edit', action: () => {} },
					{ separator: true, label: '', action: () => {} },
					{
						label: m.delete_line(),
						icon: 'delete',
						action: () => {
							editorState.lineToDelete = lineId;
							editorState.deleteLineOpen = true;
						}
					}
				]
			};
		} else {
			ctxMenu = {
				x: e.clientX,
				y: e.clientY,
				items: [
					{
						label: m.deselect_all(),
						icon: 'close',
						action: () => EditorService.deselectAll(editorState)
					}
				]
			};
		}
	}

	function handleMouseMove(e: MouseEvent) {
		const svg = e.currentTarget as SVGSVGElement;
		if (draggedStationId !== null) {
			if (!didDragStation) {
				const dx = e.clientX - dragStartScreenX;
				const dy = e.clientY - dragStartScreenY;
				if (dx * dx + dy * dy < 16) return;
				didDragStation = true;
			}
			const station = editorState.stations.find((s) => s.id === draggedStationId);
			if (station) {
				const pos = screenToSvg(e, svg);
				station.schematicX = pos.x;
				station.schematicY = pos.y;
				if (!editorState.isGlobalView && editorState.activeViewId !== null) {
					const vs = editorState.viewStations.find(
						(vs) => vs.viewId === editorState.activeViewId && vs.stationId === station.id
					);
					if (vs) {
						vs.schematicX = pos.x;
						vs.schematicY = pos.y;
					}
				}
			}
		} else if (draggedAnchorId !== null) {
			const anchor = editorState.anchorPoints.find((a) => a.id === draggedAnchorId);
			if (anchor) {
				const pos = screenToSvg(e, svg);
				anchor.schematicX = pos.x;
				anchor.schematicY = pos.y;
			}
		} else {
			viewport.movePan(e.clientX, e.clientY);
		}
	}

	async function handleMouseUp() {
		viewport.stopPan();
		if (draggedStationId !== null) {
			if (didDragStation) {
				const station = editorState.stations.find((s) => s.id === draggedStationId);
				if (station) {
					if (editorState.isGlobalView) {
						await StationService.updateStation(station.id!, {
							schematicX: station.schematicX,
							schematicY: station.schematicY
						});
					} else if (editorState.activeViewId !== null) {
						await EditorService.updateViewStationPosition(
							editorState,
							station.id!,
							station.schematicX,
							station.schematicY
						);
					}
				}
			}
			draggedStationId = null;
		}
		if (draggedAnchorId !== null) {
			const anchor = editorState.anchorPoints.find((a) => a.id === draggedAnchorId);
			if (anchor) {
				await AnchorPointService.update(anchor.id!, {
					schematicX: anchor.schematicX,
					schematicY: anchor.schematicY
				});
			}
			draggedAnchorId = null;
		}
	}

	function startDragStation(e: MouseEvent, id: number) {
		if (editorState.placementMode) return;
		e.stopPropagation();
		draggedStationId = id;
		didDragStation = false;
		dragStartScreenX = e.clientX;
		dragStartScreenY = e.clientY;
		editorState.selectedStationId = id;
		editorState.selectedAnchorId = null;
		editorState.selectedTransitTypeId = null;
		editorState.rightTab = 'station';
	}

	let segmentTopology = $derived(
		buildSegmentTopology(
			editorState.routePoints,
			editorState.lines,
			editorState.effectiveHiddenLineIds,
			editorState.lineMap
		)
	);

	let lineOffsets = $derived(
		computeLineOffsets(
			segmentTopology,
			editorState.stationMap,
			(s) => editorState.stationPosition(s),
			editorState.lines,
			editorState.effectiveHiddenLineIds
		)
	);
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	role="application"
	class="relative h-full w-full overflow-hidden [background:var(--color-surface-variant)]"
	tabindex="-1"
	onkeydown={(e) => {
		if (e.key === ' ' || e.key === 'Space') {
			e.preventDefault();
			e.stopPropagation();
			viewport.fitContent();
		}
	}}
	onmousedown={(e) => {
		if (e.target === e.currentTarget || (e.target as HTMLElement).closest('svg')) {
			e.currentTarget.focus();
		}
	}}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<svg
		bind:this={svgEl}
		class="h-full w-full {editorState.placementMode === 'station'
			? 'cursor-crosshair'
			: editorState.placementMode === 'anchor'
				? 'cursor-copy'
				: 'cursor-grab active:cursor-grabbing'}"
		viewBox="{viewport.viewBoxX} {viewport.viewBoxY} {viewport.viewBoxWidth} {viewport.viewBoxHeight}"
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseUp}
		onwheel={viewport.handleWheel}
		oncontextmenu={handleContextMenu}
	>
		<SchematicGrid
			viewBoxX={viewport.viewBoxX}
			viewBoxY={viewport.viewBoxY}
			viewBoxWidth={viewport.viewBoxWidth}
			viewBoxHeight={viewport.viewBoxHeight}
		/>
		<SchematicLines {lineOffsets} />
		<SchematicStations onstartdragstation={startDragStation} />
		<SchematicAnchors onstartdraganchor={startDragAnchor} />
	</svg>

	{#if editorState.isSwitchingView}
		<div class="absolute inset-0 z-30 flex items-center justify-center bg-surface-variant">
			<CircularProgress indeterminate class="h-8 w-8" />
		</div>
	{/if}

	{#if viewport.isTooFar}
		<div class="pointer-events-none absolute inset-0 z-20 flex items-start justify-center pt-8">
			<div
				class="rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-500 shadow-lg"
			>
				<span class="material-symbols-outlined align-middle text-sm">explore</span>
				{m.too_far()}
				{m.recenter_before_key()}
				<kbd class="rounded bg-blue-500/20 px-1.5 py-0.5 text-xs">{m.key_space()}</kbd>
				{m.recenter_after_key()}
			</div>
		</div>
	{/if}

	{#if ctxMenu}
		<ContextMenu
			x={ctxMenu.x}
			y={ctxMenu.y}
			items={ctxMenu.items}
			onclose={() => (ctxMenu = null)}
		/>
	{/if}
</div>
