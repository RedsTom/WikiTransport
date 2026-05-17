<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { EditorService } from '$lib/services/EditorService';
	import { StationService } from '$lib/services/StationService';
	import { AnchorPointService } from '$lib/services/AnchorPointService';
	import {
		ContextMenu,
		CircularProgress,
		LinePicker,
		Dialog,
		Button,
		TextField
	} from '$lib/components/ui';
	import type { ContextMenuItem } from '$lib/components/ui/ContextMenu.svelte';
	import { onMount } from 'svelte';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import {
		screenToSvg,
		screenToSvgRaw,
		distToSegment,
		closestPointOnSegment,
		buildTunnels,
		computeLineOffsets
	} from '$lib/utils/schematic';
	import { useViewport } from '$lib/utils/useViewport.svelte';
	import { useContextMenu } from '$lib/utils/useContextMenu.svelte';
	import SchematicGrid from './SchematicGrid.svelte';
	import SchematicLines from './SchematicLines.svelte';
	import SchematicStations from './SchematicStations.svelte';
	import SchematicAnchors from './SchematicAnchors.svelte';
	import SchematicSelectionRect from './SchematicSelectionRect.svelte';

	let svgEl = $state<SVGSVGElement | null>(null);
	let viewport = useViewport(() => svgEl);

	let draggedStationId = $state<number | null>(null);
	let draggedAnchorId = $state<number | null>(null);
	let didDragStation = false;
	let dragStartScreenX = 0;
	let dragStartScreenY = 0;
	let dragStartSvgPos = $state({ x: 0, y: 0 });
	let dragStartPositions = new SvelteMap<number, { x: number; y: number }>();

	let isRubberBanding = $state(false);
	let rubberBandStart = $state({ x: 0, y: 0 });
	let selectionRect = $state({ x: 0, y: 0, width: 0, height: 0 });

	let ctxMenu = useContextMenu();
	let pendingContextStationId = $state<number | null>(null);

	let stationNameDialogOpen = $state(false);
	let pendingStationName = $state('');
	let pendingCreationSvgX = $state(0);
	let pendingCreationSvgY = $state(0);

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
			editorState.clearSelection();
			editorState.selectedAnchorId = null;
			editorState.selectedTransitTypeId = null;
			editorState.rightTab = 'line';
			return;
		}

		if (e.shiftKey) {
			const rawPos = screenToSvgRaw(e, svgEl!);
			isRubberBanding = true;
			rubberBandStart = { x: rawPos.x, y: rawPos.y };
			selectionRect = { x: rawPos.x, y: rawPos.y, width: 0, height: 0 };
			return;
		}

		viewport.startPan(e.clientX, e.clientY);
	}

	function startDragAnchor(e: MouseEvent, id: number) {
		if (editorState.placementMode) return;
		e.stopPropagation();
		if (e.ctrlKey || e.metaKey || e.shiftKey) {
			editorState.toggleAnchorSelection(id);
			return;
		}
		editorState.clearSelection();
		editorState.setAnchorSelection(id);
		draggedAnchorId = id;
		didDragStation = false;
		dragStartScreenX = e.clientX;
		dragStartScreenY = e.clientY;
		const svgPos = screenToSvg(e, svgEl!);
		dragStartSvgPos = { x: svgPos.x, y: svgPos.y };
		dragStartPositions = new SvelteMap();
		for (const aid of editorState.selectedAnchorIds) {
			const ap = editorState.anchorPoints.find((a) => a.id === aid);
			if (ap) {
				dragStartPositions.set(aid, { x: ap.schematicX, y: ap.schematicY });
			}
		}
		editorState.selectedTransitTypeId = null;
	}

	async function addStationAtPos(svgX: number, svgY: number) {
		if (!editorState.project?.id) return;
		pendingCreationSvgX = svgX;
		pendingCreationSvgY = svgY;
		pendingStationName = '';
		stationNameDialogOpen = true;
	}

	async function handleConfirmStationName() {
		const name = pendingStationName.trim();
		if (!name || !editorState.project?.id) return;

		const stationId = await StationService.createStation(
			editorState.project.id,
			name,
			0,
			0,
			pendingCreationSvgX,
			pendingCreationSvgY
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
		editorState.setSelection(stationId);
		editorState.rightTab = 'station';
		editorState.placementMode = null;
		stationNameDialogOpen = false;
	}

	async function placeStationAtClick(e: MouseEvent) {
		if (!editorState.project?.id) return;
		const pos = screenToSvg(e, e.currentTarget as SVGSVGElement);
		await addStationAtPos(pos.x, pos.y);
	}

	async function addAnchorOnLine(svgX: number, svgY: number, lineId: number) {
		const rps = editorState.routePointsByLine.get(lineId) ?? [];
		if (rps.length < 2) return;
		let best: { dist: number; order: number; cx: number; cy: number } | null = null;
		for (let i = 0; i < rps.length - 1; i++) {
			const sA = editorState.stationMap.get(rps[i].stationId);
			const sB = editorState.stationMap.get(rps[i + 1].stationId);
			if (!sA || !sB) continue;
			const pA = editorState.stationPosition(sA);
			const pB = editorState.stationPosition(sB);
			const dist = distToSegment(svgX, svgY, pA.x, pA.y, pB.x, pB.y);
			if (!best || dist < best.dist) {
				const cp = closestPointOnSegment(svgX, svgY, pA.x, pA.y, pB.x, pB.y);
				best = { dist, order: (rps[i].order + rps[i + 1].order) / 2, cx: cp.x, cy: cp.y };
			}
		}
		if (!best || best.dist > 60) return;
		await AnchorPointService.create(
			lineId,
			best.cx,
			best.cy,
			best.order,
			editorState.activeViewId ?? undefined
		);
		await editorState.loadAnchorPoints(editorState.activeViewId ?? undefined);
	}

	async function placeAnchorAtClick(e: MouseEvent) {
		const svg = e.currentTarget as SVGSVGElement;
		const pos = screenToSvgRaw(e, svg);
		const target = e.target as SVGElement;
		const lineEl = target.closest('[data-line]');
		const lineId = lineEl ? Number(lineEl.getAttribute('data-line')) : null;
		if (lineId != null) {
			await addAnchorOnLine(pos.x, pos.y, lineId);
		} else {
			const hiddenLineIds = editorState.effectiveHiddenLineIds;
			let best: { lineId: number; dist: number; order: number; cx: number; cy: number } | null =
				null;
			for (const line of editorState.lines) {
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
	}

	function buildStationContextMenu(stationId: number): ContextMenuItem[] {
		const routePointLines = new Set(
			(editorState.routePointsByStation.get(stationId) ?? [])
				.map((rp) => rp.lineId)
				.filter((id) => id !== null)
		);
		const linesToAdd = editorState.lines.filter(
			(line) => line.id != null && !routePointLines.has(line.id)
		);
		const linesToRemove = editorState.lines.filter(
			(line) => line.id != null && routePointLines.has(line.id)
		);
		return [
			{
				label: m.edit_station(),
				icon: 'edit',
				action: () => {
					editorState.setSelection(stationId);
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
			{ separator: true, label: '', action: () => {} },
			{
				label: m.add_station_to_line(),
				icon: 'add_circle',
				searchable: true,
				disabled: linesToAdd.length === 0,
				children: []
			},
			{
				label: m.remove_from_line(),
				icon: 'remove_circle',
				searchable: true,
				disabled: linesToRemove.length === 0,
				children: []
			}
		];
	}

	function handleContextMenu(e: MouseEvent) {
		e.preventDefault();
		const target = e.target as SVGElement;

		if (target.tagName === 'polygon' && target.closest('[data-anchor-id]')) {
			const anchorId = Number(target.getAttribute('data-anchor-id'));
			const anchor = editorState.anchorPoints.find((a) => a.id === anchorId);
			if (!anchor) return;
			editorState.setAnchorSelection(anchorId);
			ctxMenu.show(e, [
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
			]);
			return;
		}

		if (target.tagName === 'circle') {
			const stationId = Number(target.getAttribute('data-station-id'));
			const station = editorState.stations.find((s) => s.id === stationId);
			if (!station) return;
			pendingContextStationId = stationId;
			ctxMenu.show(e, buildStationContextMenu(stationId));
		} else if (target.tagName === 'path' && target.closest('[data-line]')) {
			const lineEl = target.closest('[data-line]') as SVGElement;
			const lineId = Number(lineEl.getAttribute('data-line'));
			editorState.selectedLineId = lineId;
			editorState.rightTab = 'line';
			const rawPos = screenToSvgRaw(e, svgEl!);
			ctxMenu.show(e, [
				{ label: m.edit_line(), icon: 'edit', action: () => {} },
				{ separator: true, label: '', action: () => {} },
				{
					label: m.add_anchor(),
					icon: 'anchor',
					action: () => addAnchorOnLine(rawPos.x, rawPos.y, lineId)
				},
				{
					label: m.delete_line(),
					icon: 'delete',
					action: () => {
						editorState.lineToDelete = lineId;
						editorState.deleteLineOpen = true;
					}
				}
			]);
		} else {
			const pos = screenToSvg(e, svgEl!);
			ctxMenu.show(e, [
				{
					label: m.add_station(),
					icon: 'add_location',
					action: () => addStationAtPos(pos.x, pos.y)
				},
				{ separator: true, label: '', action: () => {} },
				{
					label: m.deselect_all(),
					icon: 'close',
					action: () => EditorService.deselectAll(editorState)
				}
			]);
		}
	}

	function handleMouseMove(e: MouseEvent) {
		const svg = e.currentTarget as SVGSVGElement;
		if (isRubberBanding) {
			const rawPos = screenToSvgRaw(e, svgEl!);
			const x = Math.min(rubberBandStart.x, rawPos.x);
			const y = Math.min(rubberBandStart.y, rawPos.y);
			const w = Math.abs(rawPos.x - rubberBandStart.x);
			const h = Math.abs(rawPos.y - rubberBandStart.y);
			selectionRect = { x, y, width: w, height: h };
			return;
		}
		if (draggedStationId !== null || draggedAnchorId !== null) {
			if (!didDragStation) {
				const dx = e.clientX - dragStartScreenX;
				const dy = e.clientY - dragStartScreenY;
				if (dx * dx + dy * dy < 16) return;
				didDragStation = true;
			}
			const pos = screenToSvg(e, svg);
			const deltaX = pos.x - dragStartSvgPos.x;
			const deltaY = pos.y - dragStartSvgPos.y;
			for (const sid of editorState.selectedStationIds) {
				const st = editorState.stations.find((s) => s.id === sid);
				if (st) {
					const orig = dragStartPositions.get(sid);
					if (orig) {
						st.schematicX = orig.x + deltaX;
						st.schematicY = orig.y + deltaY;
					}
					if (!editorState.isGlobalView && editorState.activeViewId !== null) {
						const vs = editorState.viewStations.find(
							(vs) => vs.viewId === editorState.activeViewId && vs.stationId === sid
						);
						if (vs) {
							const origVs = dragStartPositions.get(sid);
							if (origVs) {
								vs.schematicX = origVs.x + deltaX;
								vs.schematicY = origVs.y + deltaY;
							}
						}
					}
				}
			}
			for (const aid of editorState.selectedAnchorIds) {
				const ap = editorState.anchorPoints.find((a) => a.id === aid);
				if (ap) {
					const orig = dragStartPositions.get(aid);
					if (orig) {
						ap.schematicX = orig.x + deltaX;
						ap.schematicY = orig.y + deltaY;
					}
				}
			}
		} else {
			viewport.movePan(e.clientX, e.clientY);
		}
	}

	async function handleMouseUp() {
		viewport.stopPan();
		if (isRubberBanding) {
			isRubberBanding = false;
			const rect = selectionRect;
			if (rect.width > 4 || rect.height > 4) {
				const selStationIds: number[] = [];
				for (const st of editorState.stations) {
					if (!st.id) continue;
					if (editorState.effectiveHiddenStationIds.has(st.id)) continue;
					const pos = editorState.stationPosition(st);
					if (
						pos.x >= rect.x &&
						pos.x <= rect.x + rect.width &&
						pos.y >= rect.y &&
						pos.y <= rect.y + rect.height
					) {
						selStationIds.push(st.id);
					}
				}
				const selAnchorIds: number[] = [];
				const hiddenLineIds = editorState.effectiveHiddenLineIds;
				for (const ap of editorState.anchorPoints) {
					if (!ap.id) continue;
					if (hiddenLineIds.has(ap.lineId)) continue;
					if (
						ap.schematicX >= rect.x &&
						ap.schematicX <= rect.x + rect.width &&
						ap.schematicY >= rect.y &&
						ap.schematicY <= rect.y + rect.height
					) {
						selAnchorIds.push(ap.id);
					}
				}
				if (selStationIds.length > 0) {
					editorState.selectedStationIds = selStationIds;
					editorState.selectedStationId = selStationIds[selStationIds.length - 1];
				} else {
					editorState.clearSelection();
				}
				if (selAnchorIds.length > 0) {
					editorState.selectedAnchorIds = selAnchorIds;
					editorState.selectedAnchorId = selAnchorIds[selAnchorIds.length - 1];
				} else {
					editorState.clearAnchorSelection();
				}
			} else {
				editorState.clearSelection();
			}
			selectionRect = { x: 0, y: 0, width: 0, height: 0 };
			return;
		}
		if (draggedStationId !== null || draggedAnchorId !== null) {
			if (didDragStation) {
				for (const sid of editorState.selectedStationIds) {
					const st = editorState.stations.find((s) => s.id === sid);
					if (st) {
						if (editorState.isGlobalView) {
							await StationService.updateStation(st.id!, {
								schematicX: st.schematicX,
								schematicY: st.schematicY
							});
						} else if (editorState.activeViewId !== null) {
							await EditorService.updateViewStationPosition(
								editorState,
								st.id!,
								st.schematicX,
								st.schematicY
							);
						}
					}
				}
				for (const aid of editorState.selectedAnchorIds) {
					const ap = editorState.anchorPoints.find((a) => a.id === aid);
					if (ap) {
						await AnchorPointService.update(ap.id!, {
							schematicX: ap.schematicX,
							schematicY: ap.schematicY
						});
					}
				}
			}
			draggedStationId = null;
			draggedAnchorId = null;
		}
	}

	function startDragStation(e: MouseEvent, id: number) {
		if (editorState.placementMode) return;
		e.stopPropagation();
		if (e.ctrlKey || e.metaKey || e.shiftKey) {
			editorState.toggleSelection(id);
			editorState.rightTab = 'station';
			return;
		}
		if (!editorState.selectedStationIds.includes(id)) {
			editorState.clearSelection();
			editorState.setSelection(id);
		}
		draggedStationId = id;
		didDragStation = false;
		dragStartScreenX = e.clientX;
		dragStartScreenY = e.clientY;
		const svgPos = screenToSvg(e, svgEl!);
		dragStartSvgPos = { x: svgPos.x, y: svgPos.y };
		dragStartPositions = new SvelteMap();
		for (const sid of editorState.selectedStationIds) {
			const st = editorState.stations.find((s) => s.id === sid);
			if (st) {
				dragStartPositions.set(sid, { x: st.schematicX, y: st.schematicY });
			}
		}
		for (const aid of editorState.selectedAnchorIds) {
			const ap = editorState.anchorPoints.find((a) => a.id === aid);
			if (ap) {
				dragStartPositions.set(aid, { x: ap.schematicX, y: ap.schematicY });
			}
		}
		editorState.selectedTransitTypeId = null;
		editorState.rightTab = 'station';
	}

	let renderingData = $derived.by(() => {
		void editorState.tunnelOrderVersion;
		const { basePaths, tunnels, stationPoints } = buildTunnels(
			editorState.lines,
			editorState.routePoints,
			editorState.anchorPoints,
			(id) => {
				const s = editorState.stationMap.get(id);
				return s ? editorState.stationPosition(s) : null;
			},
			editorState.effectiveHiddenLineIds
		);
		const tunnelOffsets = computeLineOffsets(
			tunnels,
			editorState.lineMap,
			basePaths,
			stationPoints,
			editorState.tunnelOrder
		);
		const multiLineTunnels = new SvelteSet<string>();
		for (const [tunnelKey, tunnel] of tunnels) {
			if (tunnel.lines.size > 1) multiLineTunnels.add(tunnelKey);
		}
		return { basePaths, tunnels, tunnelOffsets, stationPoints, multiLineTunnels };
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	role="application"
	class="relative h-full w-full overflow-hidden [background:var(--color-surface-variant)]"
	tabindex="-1"
	onkeydown={(e) => {
		if ((e.key === ' ' || e.key === 'Space') && !(e.target as HTMLElement).closest('dialog')) {
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
		<SchematicLines {renderingData} />
		{#if editorState.hoveredTunnelKey}
			{@const tunnel = renderingData.tunnels.get(editorState.hoveredTunnelKey)}
			{@const x1 = tunnel
				? tunnel.u.x
				: Number(editorState.hoveredTunnelKey.split(';')[0].split(',')[0])}
			{@const y1 = tunnel
				? tunnel.u.y
				: Number(editorState.hoveredTunnelKey.split(';')[0].split(',')[1])}
			{@const x2 = tunnel
				? tunnel.v.x
				: Number(editorState.hoveredTunnelKey.split(';')[1].split(',')[0])}
			{@const y2 = tunnel
				? tunnel.v.y
				: Number(editorState.hoveredTunnelKey.split(';')[1].split(',')[1])}
			{@const dx = x2 - x1}
			{@const dy = y2 - y1}
			{@const len = Math.sqrt(dx * dx + dy * dy)}
			{@const nx = len > 0 ? (-dy / len) * 18 : 0}
			{@const ny = len > 0 ? (dx / len) * 18 : 0}
			<path
				d="M {x1 + nx} {y1 + ny} L {x2 + nx} {y2 + ny} M {x1 - nx} {y1 - ny} L {x2 - nx} {y2 - ny}"
				fill="none"
				stroke="rgba(100, 200, 255, 0.35)"
				stroke-width="24"
				stroke-linecap="round"
				pointer-events="none"
			/>
			<path
				d="M {x1} {y1} L {x2} {y2}"
				fill="none"
				stroke="rgba(100, 200, 255, 0.9)"
				stroke-width="5"
				stroke-linecap="round"
				pointer-events="none"
			/>
		{/if}
		{#if editorState.hoveredCornerKey}
			{@const [cx, cy] = editorState.hoveredCornerKey.split(',').map(Number)}
			<circle
				{cx}
				{cy}
				r="14"
				fill="rgba(100, 200, 255, 0.15)"
				stroke="rgba(100, 200, 255, 0.6)"
				stroke-width="3"
				pointer-events="none"
			/>
			<circle {cx} {cy} r="4" fill="rgba(100, 200, 255, 0.9)" pointer-events="none" />
		{/if}
		{#if isRubberBanding}
			<SchematicSelectionRect
				x={selectionRect.x}
				y={selectionRect.y}
				width={selectionRect.width}
				height={selectionRect.height}
			/>
		{/if}
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

	{#if ctxMenu.open}
		<ContextMenu
			open={ctxMenu.open}
			x={ctxMenu.x}
			y={ctxMenu.y}
			items={ctxMenu.items}
			onclose={() => ctxMenu.close()}
		>
			{#snippet submenu(item, close)}
				{#if item.searchable && pendingContextStationId !== null}
					{@const routePointLines = new Set(
						(editorState.routePointsByStation.get(pendingContextStationId!) ?? [])
							.map((rp) => rp.lineId)
							.filter((id) => id !== null)
					)}
					{#if item.icon === 'add_circle'}
						<LinePicker
							onSelect={async (lineId) => {
								const rps = editorState.routePointsByLine.get(lineId) ?? [];
								const maxOrder = rps.reduce((max, rp) => Math.max(max, rp.order), 0);
								await StationService.addStationToLine(
									lineId,
									pendingContextStationId!,
									maxOrder + 1
								);
								await editorState.loadRoutePoints();
								close();
							}}
							excludeLineIds={routePointLines}
						/>
					{:else if item.icon === 'remove_circle'}
						<LinePicker
							onSelect={async (lineId) => {
								await StationService.removeStationFromLine(lineId, pendingContextStationId!);
								await editorState.loadRoutePoints();
								close();
							}}
							onlyShowLineIds={routePointLines}
						/>
					{/if}
				{/if}
			{/snippet}
		</ContextMenu>
	{/if}

	<Dialog
		bind:open={stationNameDialogOpen}
		onclose={() => {
			stationNameDialogOpen = false;
		}}
	>
		{#snippet icon()}
			<span class="material-symbols-outlined text-blue-500">add_location</span>
		{/snippet}
		{#snippet title()}{m.new_station()}{/snippet}

		<TextField
			label={m.name()}
			bind:value={pendingStationName}
			autofocus
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter') handleConfirmStationName();
			}}
		/>

		{#snippet actions()}
			<Button
				variant="text"
				onclick={() => {
					stationNameDialogOpen = false;
				}}
			>
				{m.cancel()}
			</Button>
			<Button
				variant="filled"
				disabled={!pendingStationName.trim()}
				onclick={handleConfirmStationName}
			>
				{m.create()}
			</Button>
		{/snippet}
	</Dialog>
</div>
