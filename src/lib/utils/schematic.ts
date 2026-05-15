import { GRID_SIZE, LINE_SPACING } from '$lib/constants/schematic';
import type { Station, RoutePoint } from '$lib/types';

export function screenToSvg(e: MouseEvent, svg: SVGSVGElement): { x: number; y: number } {
	const pt = svg.createSVGPoint();
	pt.x = e.clientX;
	pt.y = e.clientY;
	const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
	return {
		x: Math.round(svgP.x / GRID_SIZE) * GRID_SIZE,
		y: Math.round(svgP.y / GRID_SIZE) * GRID_SIZE
	};
}

export function screenToSvgRaw(e: MouseEvent, svg: SVGSVGElement): { x: number; y: number } {
	const pt = svg.createSVGPoint();
	pt.x = e.clientX;
	pt.y = e.clientY;
	const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
	return { x: svgP.x, y: svgP.y };
}

export function distToSegment(
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

export function closestPointOnSegment(
	px: number,
	py: number,
	ax: number,
	ay: number,
	bx: number,
	by: number
): { x: number; y: number } {
	const dx = bx - ax,
		dy = by - ay;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) return { x: ax, y: ay };
	let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
	t = Math.max(0, Math.min(1, t));
	return { x: ax + t * dx, y: ay + t * dy };
}

export function scaleDashPattern(
	pattern: string | undefined,
	strokeWidth: number
): string | undefined {
	if (!pattern) return undefined;
	const refWidth = 6;
	const scale = strokeWidth / refWidth;
	return pattern
		.split(',')
		.map((v) => String(Math.round(Number(v) * scale)))
		.join(',');
}

export function getLabelLayout(
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

export function createOctilinearPath(coords: { x: number; y: number }[]): string {
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

export function snapToGrid(value: number, gridSize: number = GRID_SIZE): number {
	return Math.round(value / gridSize) * gridSize;
}

export function partitionLineIdsByVisibility(
	routePoints: RoutePoint[],
	stationId: number,
	hiddenLineIds: Set<number>
): { visibleLineIds: number[]; hiddenLineIds: number[] } {
	const servingLineIds = routePoints
		.filter((rp) => rp.stationId === stationId)
		.map((rp) => rp.lineId);
	const visibleLineIds: number[] = [];
	const hiddenLineIdsOut: number[] = [];
	for (const lid of servingLineIds) {
		if (hiddenLineIds.has(lid)) hiddenLineIdsOut.push(lid);
		else visibleLineIds.push(lid);
	}
	return { visibleLineIds, hiddenLineIds: hiddenLineIdsOut };
}

/**
 * Phase 1 (topological) — Caches which lines run on each segment and their ordering.
 * Only depends on lines, routePoints, and hiddenLineIds — NOT on station positions.
 * Stable during drag operations.
 */
export function buildSegmentTopology(
	routePoints: RoutePoint[],
	lines: { id?: number }[],
	hiddenLineIds: Set<number>,
	lineMap: Map<number, { id?: number; transitTypeId?: number }>
): Map<string, number[]> {
	const topology = new Map<string, number[]>();

	for (const line of lines) {
		if (!line.id || hiddenLineIds.has(line.id)) continue;
		const rpsForLine: RoutePoint[] = [];
		for (const rp of routePoints) {
			if (rp.lineId === line.id) rpsForLine.push(rp);
		}
		rpsForLine.sort((a, b) => a.order - b.order);
		const stIds = rpsForLine.map((rp) => rp.stationId);

		for (let i = 0; i < stIds.length - 1; i++) {
			const a = stIds[i],
				b = stIds[i + 1];
			const key = `${Math.min(a, b)},${Math.max(a, b)}`;
			let entry = topology.get(key);
			if (!entry) {
				entry = [];
				topology.set(key, entry);
			}
			entry.push(line.id);
		}
	}

	for (const [, lineIds] of topology) {
		lineIds.sort((a, b) => {
			const la = lineMap.get(a);
			const lb = lineMap.get(b);
			return (la?.transitTypeId ?? -1) - (lb?.transitTypeId ?? -1) || a - b;
		});
	}

	return topology;
}

/**
 * Phase 2 (positional) — Computes perpendicular offsets from cached topology + station positions.
 * Fast — only O(segments × lines-on-segment). Called on every drag mousemove.
 */
export function computeLineOffsets(
	segmentTopology: Map<string, number[]>,
	stationMap: Map<number, Station>,
	stationPosition: (station: Station) => { x: number; y: number },
	lines: { id?: number }[],
	hiddenLineIds: Set<number>
): Map<number, Map<string, { x: number; y: number }>> {
	const result = new Map<number, Map<string, { x: number; y: number }>>();
	for (const line of lines) {
		if (line.id && !hiddenLineIds.has(line.id)) result.set(line.id, new Map());
	}

	for (const [key, lineIds] of segmentTopology) {
		const [a, b] = key.split(',').map(Number);
		const sA = stationMap.get(a);
		const sB = stationMap.get(b);
		if (!sA || !sB) continue;
		const pA = stationPosition(sA);
		const pB = stationPosition(sB);
		const dx = pB.x - pA.x;
		const dy = pB.y - pA.y;
		const len = Math.sqrt(dx * dx + dy * dy);
		if (len === 0 || lineIds.length <= 1) continue;
		const perpX = dy / len;
		const perpY = -dx / len;
		for (let idx = 0; idx < lineIds.length; idx++) {
			const lid = lineIds[idx];
			const off = (idx - (lineIds.length - 1) / 2) * LINE_SPACING;
			const lineSegMap = result.get(lid);
			if (!lineSegMap) continue;
			lineSegMap.set(key, { x: perpX * off, y: perpY * off });
		}
	}

	return result;
}

/**
 * Backward-compatible combined function (for SVG export, etc.)
 * Builds topology then computes offsets.
 */
export function buildLineOffsets(
	stations: Station[],
	routePoints: RoutePoint[],
	lines: { id?: number; transitTypeId?: number }[],
	hiddenLineIds: Set<number>,
	stationPosition: (station: Station) => { x: number; y: number }
): Map<number, Map<string, { x: number; y: number }>> {
	const lineMap = new Map<number, { id?: number; transitTypeId?: number }>();
	for (const l of lines) {
		if (l.id != null) lineMap.set(l.id, l);
	}
	const stationMap = new Map<number, Station>();
	for (const s of stations) {
		if (s.id != null) stationMap.set(s.id, s);
	}
	const topology = buildSegmentTopology(routePoints, lines, hiddenLineIds, lineMap);
	return computeLineOffsets(topology, stationMap, stationPosition, lines, hiddenLineIds);
}
