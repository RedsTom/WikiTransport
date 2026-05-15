import { GRID_SIZE, LINE_SPACING } from '$lib/constants/schematic';
import type { Station, RoutePoint, Line } from '$lib/types';

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

export function buildLineOffsets(
	stations: Station[],
	routePoints: RoutePoint[],
	lines: { id?: number; transitTypeId?: number }[],
	hiddenLineIds: Set<number>,
	stationPosition: (station: Station) => { x: number; y: number }
): Map<number, Map<string, { x: number; y: number }>> {
	const segMap = new Map<string, { dx: number; dy: number; lineIds: number[] }>();

	for (const line of lines) {
		if (!line.id || hiddenLineIds.has(line.id)) continue;
		const stIds = routePoints
			.filter((rp) => rp.lineId === line.id)
			.sort((a, b) => a.order - b.order)
			.map((rp) => rp.stationId);
		for (let i = 0; i < stIds.length - 1; i++) {
			const a = stIds[i],
				b = stIds[i + 1];
			const key = `${Math.min(a, b)},${Math.max(a, b)}`;
			let entry = segMap.get(key);
			if (!entry) {
				const sA = stations.find((s) => s.id === a);
				const sB = stations.find((s) => s.id === b);
				if (!sA || !sB) continue;
				const pA = stationPosition(sA);
				const pB = stationPosition(sB);
				entry = { dx: pB.x - pA.x, dy: pB.y - pA.y, lineIds: [] };
				segMap.set(key, entry);
			}
			entry.lineIds.push(line.id);
		}
	}

	for (const [, entry] of segMap) {
		entry.lineIds.sort((a, b) => {
			const la = lines.find((l) => l.id === a);
			const lb = lines.find((l) => l.id === b);
			return (la?.transitTypeId ?? -1) - (lb?.transitTypeId ?? -1) || a - b;
		});
	}

	const result: Map<number, Map<string, { x: number; y: number }>> = new Map();
	for (const line of lines) {
		if (line.id && !hiddenLineIds.has(line.id)) result.set(line.id, new Map());
	}

	for (const [key, info] of segMap) {
		const { dx, dy, lineIds } = info;
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
