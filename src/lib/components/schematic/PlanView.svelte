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
		closestPointOnSegment
	} from '$lib/utils/schematic';
	import { LINE_SPACING } from '$lib/constants/schematic';
	import SchematicGrid from './SchematicGrid.svelte';
	import SchematicLines from './SchematicLines.svelte';
	import SchematicStations from './SchematicStations.svelte';
	import SchematicAnchors from './SchematicAnchors.svelte';

	let viewBoxX = $state(0);
	let viewBoxY = $state(0);
	let viewBoxWidth = $state(1000);
	let viewBoxHeight = $state(1000);

	let isDraggingPan = $state(false);
	let lastMouseX = $state(0);
	let lastMouseY = $state(0);

	let draggedStationId = $state<number | null>(null);
	let draggedAnchorId = $state<number | null>(null);
	let didDragStation = false;
	let dragStartScreenX = 0;
	let dragStartScreenY = 0;

	let ctxMenu = $state<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
	let svgEl = $state<SVGSVGElement | null>(null);

	let allContentPoints = $derived.by(() => {
		const points: { x: number; y: number }[] = [];
		for (const s of editorState.stations) {
			if (!editorState.isGlobalView && editorState.effectiveHiddenStationIds.has(s.id!)) continue;
			points.push(editorState.stationPosition(s));
		}
		for (const a of editorState.anchorPoints) {
			if (!editorState.isGlobalView && editorState.effectiveHiddenLineIds.has(a.lineId)) continue;
			points.push({ x: a.schematicX, y: a.schematicY });
		}
		return points;
	});

	let isTooFar = $derived.by(() => {
		if (allContentPoints.length === 0) return false;
		const vx = viewBoxX,
			vy = viewBoxY;
		const vw = viewBoxWidth,
			vh = viewBoxHeight;
		return !allContentPoints.some(
			(p) => p.x >= vx && p.x <= vx + vw && p.y >= vy && p.y <= vy + vh
		);
	});

	function fitContent() {
		if (!svgEl) return;
		if (allContentPoints.length === 0) {
			viewBoxX = 0;
			viewBoxY = 0;
			viewBoxWidth = 1000;
			viewBoxHeight = 1000;
			return;
		}
		const minX = Math.min(...allContentPoints.map((p) => p.x));
		const maxX = Math.max(...allContentPoints.map((p) => p.x));
		const minY = Math.min(...allContentPoints.map((p) => p.y));
		const maxY = Math.max(...allContentPoints.map((p) => p.y));
		const padding = 200;
		const cx = (minX + maxX) / 2;
		const cy = (minY + maxY) / 2;
		let cw = Math.max(maxX - minX + padding * 2, 200);
		let ch = Math.max(maxY - minY + padding * 2, 200);
		const ar = svgEl.clientWidth / svgEl.clientHeight;
		if (cw / ch > ar) {
			ch = cw / ar;
		} else {
			cw = ch * ar;
		}
		viewBoxX = cx - cw / 2;
		viewBoxY = cy - ch / 2;
		viewBoxWidth = cw;
		viewBoxHeight = ch;
	}

	onMount(() => {
		requestAnimationFrame(() => fitContent());
	});

	$effect(() => {
		if (editorState.isSwitchingView) return;
		const key = editorState.activeViewId === null ? 'global' : String(editorState.activeViewId);
		const vb = { x: viewBoxX, y: viewBoxY, width: viewBoxWidth, height: viewBoxHeight };
		editorState.viewBoxRecords[key] = vb;
		editorState.currentViewBox = vb;
	});

	$effect(() => {
		const key = editorState.activeViewId === null ? 'global' : String(editorState.activeViewId);
		const saved = editorState.viewBoxRecords[key];
		if (saved) {
			viewBoxX = saved.x;
			viewBoxY = saved.y;
			viewBoxWidth = saved.width;
			viewBoxHeight = saved.height;
		} else {
			fitContent();
		}
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
			return;
		}

		isDraggingPan = true;
		lastMouseX = e.clientX;
		lastMouseY = e.clientY;
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
		const svgEl = e.currentTarget as SVGSVGElement;
		const pos = screenToSvgRaw(e, svgEl);
		const target = e.target as SVGElement;
		const lineEl = target.closest('[data-line]');
		let lineId: number | null = null;
		if (lineEl) {
			lineId = Number(lineEl.getAttribute('data-line'));
		}

		const lines = lineId
			? editorState.lines.filter((l) => l.id === lineId)
			: editorState.lines.filter((l) => l.id && !editorState.effectiveHiddenLineIds.has(l.id));

		let best: { lineId: number; dist: number; order: number; cx: number; cy: number } | null = null;

		for (const line of lines) {
			if (!line.id || editorState.effectiveHiddenLineIds.has(line.id)) continue;
			const rps = editorState.routePoints
				.filter((rp) => rp.lineId === line.id)
				.sort((a, b) => a.order - b.order);
			if (rps.length < 2) continue;
			for (let i = 0; i < rps.length - 1; i++) {
				const sA = editorState.stations.find((s) => s.id === rps[i].stationId);
				const sB = editorState.stations.find((s) => s.id === rps[i + 1].stationId);
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
		await EditorService.reloadAll(editorState);
		editorState.selectedStationId = stationId;
		editorState.placementMode = null;
	}

	function buildStationContextMenu(stationId: number): ContextMenuItem[] {
		const items: ContextMenuItem[] = [
			{
				label: m.edit_station(),
				icon: 'edit',
				action: () => {
					editorState.selectedStationId = stationId;
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
			const alreadyOnLine = editorState.routePoints.some(
				(rp) => rp.lineId === line.id && rp.stationId === stationId
			);
			if (!alreadyOnLine) {
				items.push({
					label: m.add_to_line({ lineName: line.name }),
					action: async () => {
						const maxOrder = editorState.routePoints
							.filter((rp) => rp.lineId === line.id)
							.reduce((max, rp) => Math.max(max, rp.order), 0);
						await StationService.addStationToLine(line.id!, stationId, maxOrder + 1);
						await EditorService.reloadAll(editorState);
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
				EditorService.updateViewStationPosition(editorState, station.id!, pos.x, pos.y);
			}
		} else if (draggedAnchorId !== null) {
			const anchor = editorState.anchorPoints.find((a) => a.id === draggedAnchorId);
			if (anchor) {
				const pos = screenToSvg(e, svg);
				anchor.schematicX = pos.x;
				anchor.schematicY = pos.y;
			}
		} else if (isDraggingPan) {
			const dx = e.clientX - lastMouseX;
			const dy = e.clientY - lastMouseY;
			const scale = viewBoxWidth / svg.clientWidth;
			viewBoxX -= dx * scale;
			viewBoxY -= dy * scale;
			lastMouseX = e.clientX;
			lastMouseY = e.clientY;
		}
	}

	async function handleMouseUp(e: MouseEvent) {
		isDraggingPan = false;
		if (draggedStationId !== null) {
			if (didDragStation) {
				const station = editorState.stations.find((s) => s.id === draggedStationId);
				if (station && editorState.isGlobalView) {
					await StationService.updateStation(station.id!, {
						schematicX: station.schematicX,
						schematicY: station.schematicY
					});
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

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const zoomSpeed = 0.1;
		const zoomDir = e.deltaY > 0 ? 1 : -1;
		const zoomFactor = 1 + zoomDir * zoomSpeed;

		const svg = e.currentTarget as SVGSVGElement;
		const pt = svg.createSVGPoint();
		pt.x = e.clientX;
		pt.y = e.clientY;
		const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

		viewBoxX = svgP.x - (svgP.x - viewBoxX) * zoomFactor;
		viewBoxY = svgP.y - (svgP.y - viewBoxY) * zoomFactor;
		viewBoxWidth *= zoomFactor;
		viewBoxHeight *= zoomFactor;
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
	}

	type SegOffsetMap = Map<number, Map<string, { x: number; y: number }>>;

	let lineOffsets: SegOffsetMap = $derived.by(() => {
		const segMap = new Map<string, { dx: number; dy: number; lineIds: number[] }>();

		for (const line of editorState.lines) {
			if (!line.id || editorState.effectiveHiddenLineIds.has(line.id)) continue;
			const stIds = editorState.routePoints
				.filter((rp) => rp.lineId === line.id)
				.sort((a, b) => a.order - b.order)
				.map((rp) => rp.stationId);
			for (let i = 0; i < stIds.length - 1; i++) {
				const a = stIds[i],
					b = stIds[i + 1];
				const key = `${Math.min(a, b)},${Math.max(a, b)}`;
				let entry = segMap.get(key);
				if (!entry) {
					const sA = editorState.stations.find((s) => s.id === a);
					const sB = editorState.stations.find((s) => s.id === b);
					if (!sA || !sB) continue;
					const pA = editorState.stationPosition(sA);
					const pB = editorState.stationPosition(sB);
					entry = { dx: pB.x - pA.x, dy: pB.y - pA.y, lineIds: [] };
					segMap.set(key, entry);
				}
				entry.lineIds.push(line.id);
			}
		}

		for (const [, entry] of segMap) {
			entry.lineIds.sort((a, b) => {
				const la = editorState.lines.find((l) => l.id === a);
				const lb = editorState.lines.find((l) => l.id === b);
				return (la?.transitTypeId ?? -1) - (lb?.transitTypeId ?? -1) || a - b;
			});
		}

		const result: SegOffsetMap = new Map();
		for (const line of editorState.lines) {
			if (line.id && !editorState.effectiveHiddenLineIds.has(line.id)) {
				result.set(line.id, new Map());
			}
		}

		for (const [key, info] of segMap) {
			const { dx, dy, lineIds } = info;
			const len = Math.sqrt(dx * dx + dy * dy);
			if (len === 0 || lineIds.length <= 1) continue;
			const perpX = dy / len;
			const perpY = -dx / len;

			for (let idx = 0; idx < lineIds.length; idx++) {
				const lineId = lineIds[idx];
				const off = (idx - (lineIds.length - 1) / 2) * LINE_SPACING;
				const lineSegMap = result.get(lineId);
				if (!lineSegMap) continue;
				lineSegMap.set(key, { x: perpX * off, y: perpY * off });
			}
		}

		return result;
	});
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
			fitContent();
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
		viewBox="{viewBoxX} {viewBoxY} {viewBoxWidth} {viewBoxHeight}"
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseUp}
		onwheel={handleWheel}
		oncontextmenu={handleContextMenu}
	>
		<SchematicGrid {viewBoxX} {viewBoxY} {viewBoxWidth} {viewBoxHeight} />
		<SchematicLines {lineOffsets} />
		<SchematicStations onstartdragstation={startDragStation} />
		<SchematicAnchors onstartdraganchor={startDragAnchor} />
	</svg>

	{#if editorState.isSwitchingView}
		<div class="absolute inset-0 z-30 flex items-center justify-center bg-surface-variant">
			<CircularProgress indeterminate class="h-8 w-8" />
		</div>
	{/if}

	{#if isTooFar}
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
