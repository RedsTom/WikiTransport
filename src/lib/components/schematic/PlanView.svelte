<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { editorState } from '$lib/store/editor.svelte';
	import { EditorService } from '$lib/services/EditorService';
	import { StationService } from '$lib/services/StationService';
	import { AnchorPointService } from '$lib/services/AnchorPointService';
	import { ContextMenu, CircularProgress } from '$lib/components/ui';
	import type { ContextMenuItem } from '$lib/components/ui/ContextMenu.svelte';
	import { onMount } from 'svelte';
	import { measureText } from '$lib/utils/textMeasure';
	import { getContrastColor } from '$lib/utils/color';
	import {
		screenToSvg,
		distToSegment,
		scaleDashPattern,
		getLabelLayout,
		createOctilinearPath
	} from '$lib/utils/schematic';
	import {
		GRID_SIZE,
		POINT_RADIUS,
		LINE_WIDTH,
		LINE_SPACING,
		DIR_CFG
	} from '$lib/constants/schematic';
	import type {
		InterchangeBadgeMode,
		InterchangeBadgeDirection,
		IconShape
	} from '$lib/types/models';

	function sortLineIds(lineIds: number[]): number[] {
		return [...lineIds].sort((a, b) => {
			const la = editorState.lines.find((l) => l.id === a);
			const lb = editorState.lines.find((l) => l.id === b);
			if (!la || !lb) return a - b;
			if (la.transitTypeId !== lb.transitTypeId)
				return (la.transitTypeId ?? -1) - (lb.transitTypeId ?? -1);
			return (la.name ?? '').localeCompare(lb.name ?? '');
		});
	}

	const BADGE_SIZE = 20;
	const BADGE_GAP = 3;
	const BADGE_HALF = BADGE_SIZE / 2;
	const BADGE_GAP_FROM_ANCHOR = 20;
	const LABEL_BADGE_GAP = 4;
	const STACK_BADGE_GAP = 12;
	const TEXT_CENTER_OFFSET = -4;
	const DIAMOND_HALF = BADGE_HALF / Math.SQRT2;
	const DIAMOND_SIZE = DIAMOND_HALF * 2;

	function getBadgeLayout(
		mode: InterchangeBadgeMode,
		direction: InterchangeBadgeDirection,
		stationX: number,
		stationY: number,
		stationLabelDir: string,
		labelLayout: { x: number; y: number; subtitleY: number },
		badgeCount: number,
		textWidth: number = 0,
		labelAnchor: string = 'E'
	): { startX: number; startY: number; horizontal: boolean; centeringOffset: number } {
		const totalW = badgeCount * BADGE_SIZE + (badgeCount - 1) * BADGE_GAP;
		const totalH = badgeCount * BADGE_SIZE + (badgeCount - 1) * BADGE_GAP;
		const useDir = stationLabelDir;

		const textRightExtent =
			labelAnchor === 'end' ? 0 : labelAnchor === 'middle' ? textWidth / 2 : textWidth;
		const textLeftExtent =
			labelAnchor === 'start' ? 0 : labelAnchor === 'middle' ? textWidth / 2 : textWidth;

		if (mode === 'station') {
			const anchorX = stationX;
			const anchorY = stationY;

			const isHorizontal = !['E', 'W'].includes(direction);
			const isSLabel = useDir.includes('S');

			let startX: number = 0;
			let startY: number = 0;

			if (isHorizontal) {
				startX = anchorX - totalW / 2;
			} else {
				startY = anchorY - totalW / 2;
			}

			switch (direction) {
				case 'N':
					startY = anchorY - BADGE_GAP_FROM_ANCHOR - BADGE_SIZE;
					break;
				case 'S':
					if (isSLabel) {
						startY = anchorY - BADGE_GAP_FROM_ANCHOR - BADGE_SIZE;
					} else {
						startY = anchorY + BADGE_GAP_FROM_ANCHOR;
					}
					break;
				case 'E':
					startX = anchorX + BADGE_GAP_FROM_ANCHOR;
					break;
				case 'W':
					startX = anchorX - BADGE_GAP_FROM_ANCHOR - BADGE_SIZE;
					break;
				case 'NE':
					startX = anchorX + BADGE_GAP_FROM_ANCHOR / 2 - totalW / 2;
					startY = anchorY - BADGE_GAP_FROM_ANCHOR - BADGE_SIZE;
					break;
				case 'NW':
					startX = anchorX - BADGE_GAP_FROM_ANCHOR / 2 - totalW / 2;
					startY = anchorY - BADGE_GAP_FROM_ANCHOR - BADGE_SIZE;
					break;
				case 'SE':
					startX = anchorX + BADGE_GAP_FROM_ANCHOR / 2 - totalW / 2;
					if (isSLabel) {
						startY = anchorY - BADGE_GAP_FROM_ANCHOR - BADGE_SIZE;
					} else {
						startY = anchorY + BADGE_GAP_FROM_ANCHOR;
					}
					break;
				case 'SW':
					startX = anchorX - BADGE_GAP_FROM_ANCHOR / 2 - totalW / 2;
					if (isSLabel) {
						startY = anchorY - BADGE_GAP_FROM_ANCHOR - BADGE_SIZE;
					} else {
						startY = anchorY + BADGE_GAP_FROM_ANCHOR;
					}
					break;
			}

			return { startX, startY, horizontal: isHorizontal, centeringOffset: 0 };
		}

		if (mode === 'next_to_text') {
			if (labelAnchor === 'end') {
				return {
					startX: labelLayout.x - textLeftExtent - LABEL_BADGE_GAP - totalW,
					startY: labelLayout.y - BADGE_SIZE / 2 + TEXT_CENTER_OFFSET,
					horizontal: true,
					centeringOffset: 0
				};
			}
			const centeringOffset = labelAnchor === 'middle' ? -(LABEL_BADGE_GAP + totalW) / 2 : 0;
			return {
				startX: labelLayout.x + textRightExtent + LABEL_BADGE_GAP + centeringOffset,
				startY: labelLayout.y - BADGE_SIZE / 2 + TEXT_CENTER_OFFSET,
				horizontal: true,
				centeringOffset
			};
		}

		const gap = STACK_BADGE_GAP;
		switch (useDir) {
			case 'E':
			case 'NE':
			case 'SE':
				return {
					startX: labelLayout.x + textRightExtent + gap,
					startY: labelLayout.y - totalH / 2,
					horizontal: false,
					centeringOffset: 0
				};
			case 'W':
			case 'NW':
			case 'SW':
				return {
					startX: labelLayout.x - textLeftExtent - gap - BADGE_SIZE,
					startY: labelLayout.y - totalH / 2,
					horizontal: false,
					centeringOffset: 0
				};
			case 'N':
				return {
					startX: labelLayout.x - totalW / 2,
					startY: labelLayout.y - gap - BADGE_SIZE,
					horizontal: true,
					centeringOffset: 0
				};
			case 'S':
				return {
					startX: labelLayout.x - totalW / 2,
					startY: labelLayout.y + gap,
					horizontal: true,
					centeringOffset: 0
				};
			default:
				return {
					startX: labelLayout.x + textRightExtent + gap,
					startY: labelLayout.y - totalH / 2,
					horizontal: false,
					centeringOffset: 0
				};
		}
	}

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
		if (target.tagName === 'circle') return;
		if (target.tagName === 'polygon' && target.closest('[data-anchor-id]')) return;

		if (target.tagName === 'path' && target.closest('[data-line]')) {
			const lineEl = target.closest('[data-line]') as SVGElement;
			const lineId = Number(lineEl.getAttribute('data-line'));
			editorState.selectedLineId = lineId;
			editorState.selectedStationId = null;
			editorState.selectedAnchorId = null;
			editorState.selectedTransitTypeId = null;
			if (editorState.placementMode === 'anchor') {
				editorState.anchorLineClicked = true;
			}
			return;
		}

		if (editorState.placementMode === 'station') {
			placeStationAtClick(e);
			return;
		}

		if (editorState.placementMode === 'anchor') {
			if (!editorState.anchorLineClicked) return;
			placeAnchorAtClick(e);
			return;
		}

		isDraggingPan = true;
		lastMouseX = e.clientX;
		lastMouseY = e.clientY;
	}

	function startDragAnchor(e: MouseEvent, id: number) {
		e.stopPropagation();
		draggedAnchorId = id;
		editorState.selectedAnchorId = id;
		editorState.selectedStationId = null;
		editorState.selectedTransitTypeId = null;
	}

	async function placeAnchorAtClick(e: MouseEvent) {
		if (!editorState.selectedLineId) return;
		const pos = screenToSvg(e, e.currentTarget as SVGSVGElement);

		const rps = editorState.routePoints
			.filter((rp) => rp.lineId === editorState.selectedLineId)
			.sort((a, b) => a.order - b.order);
		if (rps.length < 2) return;

		let bestDist = Infinity;
		let bestOrder = 0;

		for (let i = 0; i < rps.length - 1; i++) {
			const sA = editorState.stations.find((s) => s.id === rps[i].stationId);
			const sB = editorState.stations.find((s) => s.id === rps[i + 1].stationId);
			if (!sA || !sB) continue;
			const pA = editorState.stationPosition(sA);
			const pB = editorState.stationPosition(sB);
			const dist = distToSegment(pos.x, pos.y, pA.x, pA.y, pB.x, pB.y);
			if (dist < bestDist) {
				bestDist = dist;
				bestOrder = (rps[i].order + rps[i + 1].order) / 2;
			}
		}

		if (bestDist > 60) return;

		await AnchorPointService.create(
			editorState.selectedLineId,
			pos.x,
			pos.y,
			bestOrder,
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
		if (editorState.selectedLineId !== null) {
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
		<defs>
			<pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
				<path
					d="M {GRID_SIZE} 0 L 0 0 0 {GRID_SIZE}"
					fill="none"
					stroke="currentColor"
					stroke-width="1"
					class="text-outline/25"
				/>
			</pattern>
		</defs>

		<rect
			x={viewBoxX - viewBoxWidth}
			y={viewBoxY - viewBoxHeight}
			width={viewBoxWidth * 3}
			height={viewBoxHeight * 3}
			fill="url(#grid)"
		/>

		<!-- Lines -->
		{#each editorState.lines as line}
			{@const isHidden = editorState.effectiveHiddenLineIds.has(line.id!)}
			{#if !isHidden}
				{@const points = editorState.routePoints
					.filter((rp) => rp.lineId === line.id)
					.sort((a, b) => a.order - b.order)}
				{@const segOffMap = lineOffsets.get(line.id!)}
				{@const lineAnchors = editorState.anchorPoints
					.filter((ap) => ap.lineId === line.id)
					.sort((a, b) => a.order - b.order)}
				{@const allCoords = (() => {
					const coords: { x: number; y: number; order: number }[] = [];
					for (let i = 0; i < points.length; i++) {
						const rp = points[i];
						const s = editorState.stations.find((st) => st.id === rp.stationId);
						if (!s) continue;
						const pos = editorState.stationPosition(s);
						let offX = 0,
							offY = 0,
							cnt = 0;
						const addOff = (a: number, b: number) => {
							const k = `${Math.min(a, b)},${Math.max(a, b)}`;
							const o = segOffMap?.get(k);
							if (o) {
								offX += o.x;
								offY += o.y;
								cnt++;
							}
						};
						if (i > 0) addOff(points[i - 1].stationId, rp.stationId);
						if (i < points.length - 1) addOff(rp.stationId, points[i + 1].stationId);
						if (cnt > 0) {
							offX /= cnt;
							offY /= cnt;
						}
						coords.push({ x: pos.x + offX, y: pos.y + offY, order: rp.order });
					}
					for (const ap of lineAnchors) {
						const beforeRps = points.filter((rp) => rp.order < ap.order);
						const afterRps = points.filter((rp) => rp.order > ap.order);
						if (beforeRps.length === 0 || afterRps.length === 0) {
							coords.push({ x: ap.schematicX, y: ap.schematicY, order: ap.order });
							continue;
						}
						const k = `${Math.min(beforeRps[beforeRps.length - 1].stationId, afterRps[0].stationId)},${Math.max(beforeRps[beforeRps.length - 1].stationId, afterRps[0].stationId)}`;
						const o = segOffMap?.get(k);
						coords.push({
							x: ap.schematicX + (o?.x ?? 0),
							y: ap.schematicY + (o?.y ?? 0),
							order: ap.order
						});
					}
					coords.sort((a, b) => a.order - b.order);
					return coords;
				})()}

				{#if allCoords.length > 1}
					<path
						d={createOctilinearPath(allCoords)}
						fill="none"
						stroke={line.color}
						stroke-width={line.strokeWidth ?? LINE_WIDTH}
						stroke-dasharray={scaleDashPattern(line.dashPattern, line.strokeWidth ?? LINE_WIDTH)}
						stroke-linecap="round"
						stroke-linejoin="round"
						opacity={editorState.selectedLineId === line.id ? 1 : 0.7}
						data-line={line.id}
						class="cursor-pointer"
					/>
				{/if}
			{/if}
		{/each}

		<!-- Stations -->
		{#each editorState.stations as station}
			{@const isHidden =
				!editorState.isGlobalView && editorState.effectiveHiddenStationIds.has(station.id!)}
			{#if !isHidden}
				{@const pos = editorState.stationPosition(station)}
				{@const isSelected = editorState.selectedStationId === station.id}
				{@const labelDir = editorState.stationLabelDirection(station)}
				{@const labelAnchor = editorState.stationLabelAnchor(station)}
				{@const dCfg = DIR_CFG[labelDir] ?? DIR_CFG.E}
				{@const subAlign = editorState.stationSubtitleAlign(station)}
				{@const anchorDx = editorState.stationAnchorDx(station)}
				{@const anchorDy = editorState.stationAnchorDy(station)}
				<circle
					cx={pos.x}
					cy={pos.y}
					r={POINT_RADIUS}
					fill="white"
					stroke={isSelected ? 'black' : 'currentColor'}
					stroke-width={isSelected ? 4 : 2}
					class="cursor-pointer text-on-surface {isSelected ? '' : 'hover:stroke-primary'}"
					onmousedown={(e) => startDragStation(e, station.id!)}
					data-station-id={station.id}
				/>
				{@const hasSubtitle = !!station.subtitle}
				{@const servingLineIds = [
					...new Set(
						editorState.routePoints
							.filter((rp) => rp.stationId === station.id)
							.map((rp) => rp.lineId)
					)
				].filter((id) => editorState.lines.some((l) => l.id === id))}
				{@const hiddenLineIdsSet = editorState.effectiveHiddenLineIds}
				{@const hiddenInterchangeIds = editorState.stationHiddenInterchangeLineIds(station)}
				{@const hiddenInterchangeIdsSet = new Set(hiddenInterchangeIds)}
				{@const rawBadgeLineIds = servingLineIds.filter(
					(id) => hiddenLineIdsSet.has(id) && !hiddenInterchangeIdsSet.has(id)
				)}
				{@const interchangeBadgeLineIds = sortLineIds(rawBadgeLineIds)}
				{@const badgeMode = editorState.stationInterchangeBadgeMode(station)}
				{@const badgeDirection = editorState.stationInterchangeBadgeDirection(station)}
				{@const layout = getLabelLayout(labelAnchor, anchorDx, anchorDy, pos.x, pos.y)}
				{@const titleFontSize = hasSubtitle ? 11 : 12}
				{@const subFontSize = 9}
				{@const titleW = measureText(station.name, titleFontSize, true)}
				{@const subW = hasSubtitle ? measureText(station.subtitle!, subFontSize) : 0}
				{@const badgeLayout = getBadgeLayout(
					badgeMode,
					badgeDirection,
					pos.x,
					pos.y,
					labelDir,
					layout,
					interchangeBadgeLineIds.length,
					titleW,
					dCfg.anchor
				)}
				{@const centeringOffset = badgeLayout.centeringOffset}
				{@const rawTitleX =
					dCfg.anchor === 'end'
						? layout.x - titleW
						: dCfg.anchor === 'middle'
							? layout.x - titleW / 2
							: layout.x}
				{@const rawSubX =
					subAlign === 'left'
						? rawTitleX
						: subAlign === 'center'
							? rawTitleX + (titleW - subW) / 2
							: subAlign === 'right'
								? rawTitleX + titleW - subW
								: dCfg.anchor === 'end'
									? layout.x - subW
									: dCfg.anchor === 'middle'
										? layout.x - subW / 2
										: layout.x}
				{@const titleX = rawTitleX + centeringOffset}
				{@const subX = rawSubX + centeringOffset}
				{@const tx = dCfg.rotation
					? `rotate(${dCfg.rotation}, ${layout.x}, ${layout.y})`
					: undefined}
				<g transform={tx ? `${tx}` : undefined}>
					<text
						x={titleX}
						y={layout.y}
						font-size={titleFontSize}
						font-family="sans-serif"
						font-weight="bold"
						fill="currentColor"
						text-anchor="start"
						class="pointer-events-none text-on-surface"
					>
						{station.name}
					</text>
					{#if hasSubtitle}
						<text
							x={subX}
							y={layout.subtitleY}
							font-size={subFontSize}
							font-family="sans-serif"
							fill="currentColor"
							text-anchor="start"
							class="pointer-events-none text-on-surface-variant/70"
						>
							{station.subtitle}
						</text>
					{/if}
				</g>

				{#if interchangeBadgeLineIds.length > 0}
					{#each interchangeBadgeLineIds as lid, i}
						{@const line = editorState.lines.find((l) => l.id === lid)}
						{@const tt = editorState.transitTypes.find((t) => t.id === line?.transitTypeId)}
						{@const shape = (tt?.iconShape ?? 'square') as IconShape}
						{@const textColor = getContrastColor(line?.color ?? '#999')}
						{@const cx = badgeLayout.horizontal
							? badgeLayout.startX + i * (BADGE_SIZE + BADGE_GAP) + BADGE_SIZE / 2
							: badgeLayout.startX + BADGE_SIZE / 2}
						{@const cy = badgeLayout.horizontal
							? badgeLayout.startY + BADGE_SIZE / 2
							: badgeLayout.startY + i * (BADGE_SIZE + BADGE_GAP) + BADGE_SIZE / 2}
						{#if line}
							{#if shape === 'circle'}
								<circle
									{cx}
									{cy}
									r={BADGE_HALF}
									fill={line.color}
									stroke="white"
									stroke-width="1.5"
									class="pointer-events-none"
								/>
							{:else if shape === 'square'}
								<rect
									x={cx - BADGE_HALF}
									y={cy - BADGE_HALF}
									width={BADGE_SIZE}
									height={BADGE_SIZE}
									rx="2"
									fill={line.color}
									stroke="white"
									stroke-width="1.5"
									class="pointer-events-none"
								/>
							{:else if shape === 'diamond'}
								<rect
									x={cx - DIAMOND_HALF}
									y={cy - DIAMOND_HALF}
									width={DIAMOND_SIZE}
									height={DIAMOND_SIZE}
									rx="2"
									fill={line.color}
									stroke="white"
									stroke-width="1.5"
									transform="rotate(45, {cx}, {cy})"
									class="pointer-events-none"
								/>
							{:else}
								<rect
									x={cx - BADGE_HALF}
									y={cy - BADGE_HALF}
									width={BADGE_SIZE}
									height={BADGE_SIZE}
									rx={BADGE_HALF}
									fill={line.color}
									stroke="white"
									stroke-width="1.5"
									class="pointer-events-none"
								/>
							{/if}
							<text
								x={cx}
								y={cy + (shape === 'diamond' ? 2.1 : 3.5)}
								text-anchor="middle"
								font-family="sans-serif"
								font-size={shape === 'diamond' ? 7 : 10}
								font-weight="bold"
								fill={textColor}
								class="pointer-events-none"
							>
								{line.name}
							</text>
						{/if}
					{/each}
				{/if}
			{/if}
		{/each}

		<!-- Anchors -->
		{#each editorState.anchorPoints as ap}
			{@const isHiddenAnchor =
				!editorState.isGlobalView && editorState.effectiveHiddenLineIds.has(ap.lineId)}
			{#if !isHiddenAnchor}
				{@const isSelected = editorState.selectedAnchorId === ap.id}
				<polygon
					points="-5,0 0,-5 5,0 0,5"
					fill={isSelected ? 'currentColor' : 'currentColor'}
					stroke={isSelected ? 'black' : 'none'}
					stroke-width={isSelected ? 3 : 0}
					class="{isSelected ? 'text-primary' : 'text-primary/40'} cursor-pointer"
					transform="translate({ap.schematicX}, {ap.schematicY})"
					data-anchor-id={ap.id}
					onmousedown={(e) => startDragAnchor(e, ap.id!)}
				/>
			{/if}
		{/each}
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
