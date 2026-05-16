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

