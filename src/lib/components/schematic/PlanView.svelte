<script lang="ts">
	import { editorState } from '$lib/store/editor.svelte';
	import { StationService } from '$lib/services/StationService';
	import { AnchorPointService } from '$lib/services/AnchorPointService';
	import { ContextMenu } from '$lib/components/ui';
	import type { ContextMenuItem } from '$lib/components/ui/ContextMenu.svelte';
	import type { Station } from '$lib/types/models';
	import { measureText } from '$lib/utils/textMeasure';

	const GRID_SIZE = 40;
	const POINT_RADIUS = 8;
	const LINE_WIDTH = 6;

	let viewBoxX = $state(0);
	let viewBoxY = $state(0);
	let viewBoxWidth = $state(1000);
	let viewBoxHeight = $state(1000);

	let isDraggingPan = $state(false);
	let lastMouseX = $state(0);
	let lastMouseY = $state(0);

	let draggedStationId = $state<number | null>(null);
	let draggedAnchorId = $state<number | null>(null);

	let ctxMenu = $state<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

	function screenToSvg(e: MouseEvent): { x: number; y: number } {
		const svg = e.currentTarget as SVGSVGElement;
		const pt = svg.createSVGPoint();
		pt.x = e.clientX;
		pt.y = e.clientY;
		const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
		return {
			x: Math.round(svgP.x / GRID_SIZE) * GRID_SIZE,
			y: Math.round(svgP.y / GRID_SIZE) * GRID_SIZE
		};
	}

	function distToSegment(
		px: number,
		py: number,
		ax: number,
		ay: number,
		bx: number,
		by: number
	): number {
		const dx = bx - ax,
			dy = by - ay;
		const lenSq = dx * dx + dy * dy;
		if (lenSq === 0) return Math.hypot(px - ax, py - ay);
		let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
		t = Math.max(0, Math.min(1, t));
		return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
	}

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
		const pos = screenToSvg(e);

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
		const pos = screenToSvg(e);
		const stationId = await StationService.createStation(
			editorState.project.id,
			`Station ${editorState.stations.length + 1}`,
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
		await editorState.reloadAll();
		editorState.selectedStationId = stationId;
		editorState.placementMode = null;
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
						label: 'Edit anchor',
						icon: 'edit',
						action: () => {
							editorState.selectedAnchorId = anchorId;
						}
					},
					{ separator: true, label: '', action: () => {} },
					{
						label: 'Delete anchor',
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

			const items: ContextMenuItem[] = [
				{
					label: 'Edit station',
					icon: 'edit',
					action: () => {
						editorState.selectedStationId = stationId;
					}
				},
				{
					label: 'Delete station',
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
						label: `Add to ${line.name}`,
						action: async () => {
							const maxOrder = editorState.routePoints
								.filter((rp) => rp.lineId === line.id)
								.reduce((max, rp) => Math.max(max, rp.order), 0);
							await StationService.addStationToLine(line.id!, stationId, maxOrder + 1);
							await editorState.reloadAll();
						}
					});
				}
			}

			ctxMenu = { x: e.clientX, y: e.clientY, items };
		} else if (target.tagName === 'path' && target.closest('[data-line]')) {
			const lineEl = target.closest('[data-line]') as SVGElement;
			const lineId = Number(lineEl.getAttribute('data-line'));
			editorState.selectedLineId = lineId;
			ctxMenu = {
				x: e.clientX,
				y: e.clientY,
				items: [
					{ label: 'Edit line', icon: 'edit', action: () => {} },
					{ separator: true, label: '', action: () => {} },
					{
						label: 'Delete line',
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
						label: 'Deselect all',
						icon: 'close',
						action: () => {
							editorState.selectedLineId = null;
							editorState.selectedStationId = null;
							editorState.selectedAnchorId = null;
							editorState.selectedTransitTypeId = null;
						}
					}
				]
			};
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (draggedStationId !== null) {
			const station = editorState.stations.find((s) => s.id === draggedStationId);
			if (station) {
				const svg = e.currentTarget as SVGSVGElement;
				const pt = svg.createSVGPoint();
				pt.x = e.clientX;
				pt.y = e.clientY;
				const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
				const snapX = Math.round(svgP.x / GRID_SIZE) * GRID_SIZE;
				const snapY = Math.round(svgP.y / GRID_SIZE) * GRID_SIZE;
				editorState.updateViewStationPosition(station.id!, snapX, snapY);
			}
		} else if (draggedAnchorId !== null) {
			const anchor = editorState.anchorPoints.find((a) => a.id === draggedAnchorId);
			if (anchor) {
				const svg = e.currentTarget as SVGSVGElement;
				const pt = svg.createSVGPoint();
				pt.x = e.clientX;
				pt.y = e.clientY;
				const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
				const snapX = Math.round(svgP.x / GRID_SIZE) * GRID_SIZE;
				const snapY = Math.round(svgP.y / GRID_SIZE) * GRID_SIZE;
				anchor.schematicX = snapX;
				anchor.schematicY = snapY;
			}
		} else if (isDraggingPan) {
			const dx = e.clientX - lastMouseX;
			const dy = e.clientY - lastMouseY;
			const scale = viewBoxWidth / (e.currentTarget as SVGSVGElement).clientWidth;
			viewBoxX -= dx * scale;
			viewBoxY -= dy * scale;
			lastMouseX = e.clientX;
			lastMouseY = e.clientY;
		}
	}

	async function handleMouseUp(e: MouseEvent) {
		isDraggingPan = false;
		if (draggedStationId !== null) {
			const station = editorState.stations.find((s) => s.id === draggedStationId);
			if (station && editorState.isGlobalView) {
				await StationService.updateStation(station.id!, {
					schematicX: station.schematicX,
					schematicY: station.schematicY
				});
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

		const newWidth = viewBoxWidth * zoomFactor;
		const newHeight = viewBoxHeight * zoomFactor;

		viewBoxX = svgP.x - (svgP.x - viewBoxX) * zoomFactor;
		viewBoxY = svgP.y - (svgP.y - viewBoxY) * zoomFactor;
		viewBoxWidth = newWidth;
		viewBoxHeight = newHeight;
	}

	function startDragStation(e: MouseEvent, id: number) {
		e.stopPropagation();
		draggedStationId = id;
		editorState.selectedStationId = id;
		editorState.selectedAnchorId = null;
		editorState.selectedTransitTypeId = null;
	}

	function scaleDashPattern(pattern: string | undefined, strokeWidth: number): string | undefined {
		if (!pattern) return undefined;
		const refWidth = 6;
		const scale = strokeWidth / refWidth;
		return pattern
			.split(',')
			.map((v) => String(Math.round(Number(v) * scale)))
			.join(',');
	}

	const LINE_SPACING = 12;

	let lineOffsets = $derived.by(() => {
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

		const result = new Map<number, Map<string, { x: number; y: number }>>();
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
				const segMap = result.get(lineId);
				if (!segMap) continue;
				segMap.set(key, { x: perpX * off, y: perpY * off });
			}
		}

		return result;
	});

	const DIR_CFG: Record<string, { anchor: string; rotation: number }> = {
		N: { anchor: 'middle', rotation: 0 },
		NE: { anchor: 'start', rotation: -45 },
		E: { anchor: 'start', rotation: 0 },
		SE: { anchor: 'start', rotation: 45 },
		S: { anchor: 'middle', rotation: 0 },
		SW: { anchor: 'end', rotation: -45 },
		W: { anchor: 'end', rotation: 0 },
		NW: { anchor: 'end', rotation: 45 }
	};

	function getLabelLayout(
		anchor: string,
		dx: number,
		dy: number,
		sx: number,
		sy: number
	): { x: number; y: number; subtitleY: number } {
		const anchorX =
			(
				{
					N: sx,
					NE: sx + dx,
					E: sx + dx,
					SE: sx + dx,
					S: sx,
					SW: sx - dx,
					W: sx - dx,
					NW: sx - dx
				} as Record<string, number>
			)[anchor] ?? sx + dx;
		const anchorY =
			(
				{
					N: sy - dy,
					NE: sy - dy,
					E: sy,
					SE: sy + dy,
					S: sy + dy,
					SW: sy + dy,
					W: sy,
					NW: sy - dy
				} as Record<string, number>
			)[anchor] ?? sy;

		let titleY: number;
		if (anchor === 'N' || anchor === 'NE' || anchor === 'NW') {
			titleY = anchorY - 3;
		} else if (anchor === 'S' || anchor === 'SE' || anchor === 'SW') {
			titleY = anchorY + 9;
		} else {
			titleY = anchorY + 3;
		}

		return { x: anchorX, y: titleY, subtitleY: titleY + 13 };
	}

	function createOctilinearPath(coords: { x: number; y: number }[]): string {
		if (coords.length === 0) return '';
		let path = `M ${coords[0].x} ${coords[0].y}`;
		for (let i = 1; i < coords.length; i++) {
			const p1 = coords[i - 1];
			const p2 = coords[i];

			const dx = p2.x - p1.x;
			const dy = p2.y - p1.y;

			const adx = Math.abs(dx);
			const ady = Math.abs(dy);

			const minD = Math.min(adx, ady);

			if (minD > 0) {
				const midX = p1.x + Math.sign(dx) * minD;
				const midY = p1.y + Math.sign(dy) * minD;
				path += ` L ${midX} ${midY}`;

				if (adx !== ady) {
					path += ` L ${p2.x} ${p2.y}`;
				}
			} else {
				path += ` L ${p2.x} ${p2.y}`;
			}
		}
		return path;
	}
</script>

<div class="h-full w-full overflow-hidden [background:var(--color-surface-variant)]">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<svg
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
			{@const isHidden =
				editorState.effectiveHiddenLineIds.has(line.id!) ||
				(line.transitTypeId !== undefined && editorState.hiddenTypeIds.has(line.transitTypeId))}
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
				{@const layout = getLabelLayout(labelAnchor, anchorDx, anchorDy, pos.x, pos.y)}
				{@const titleFontSize = hasSubtitle ? 11 : 12}
				{@const subFontSize = 9}
				{@const titleW = measureText(station.name, titleFontSize, true)}
				{@const subW = hasSubtitle ? measureText(station.subtitle!, subFontSize) : 0}
				{@const titleX =
					dCfg.anchor === 'end'
						? layout.x - titleW
						: dCfg.anchor === 'middle'
							? layout.x - titleW / 2
							: layout.x}
				{@const subX =
					subAlign === 'left'
						? titleX
						: subAlign === 'center'
							? titleX + (titleW - subW) / 2
							: subAlign === 'right'
								? titleX + titleW - subW
								: dCfg.anchor === 'end'
									? layout.x - subW
									: dCfg.anchor === 'middle'
										? layout.x - subW / 2
										: layout.x}
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
			{/if}
		{/each}

		<!-- Anchors -->
		{#each editorState.anchorPoints as ap}
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
		{/each}
	</svg>

	{#if ctxMenu}
		<ContextMenu
			x={ctxMenu.x}
			y={ctxMenu.y}
			items={ctxMenu.items}
			onclose={() => (ctxMenu = null)}
		/>
	{/if}
</div>
