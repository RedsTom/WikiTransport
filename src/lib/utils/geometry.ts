import { GRID_SIZE } from '$lib/constants/schematic';

export type Point = { x: number; y: number };

export function screenToSvg(e: MouseEvent, svg: SVGSVGElement): Point {
	const pt = svg.createSVGPoint();
	pt.x = e.clientX;
	pt.y = e.clientY;
	const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
	return {
		x: Math.round(svgP.x / GRID_SIZE) * GRID_SIZE,
		y: Math.round(svgP.y / GRID_SIZE) * GRID_SIZE
	};
}

export function screenToSvgRaw(e: MouseEvent, svg: SVGSVGElement): Point {
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
): Point {
	const dx = bx - ax,
		dy = by - ay;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) return { x: ax, y: ay };
	let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
	t = Math.max(0, Math.min(1, t));
	return { x: ax + t * dx, y: ay + t * dy };
}

export function snapToGrid(value: number, gridSize: number = GRID_SIZE): number {
	return Math.round(value / gridSize) * gridSize;
}

export function routeOctilinear(p1: Point, p2: Point): Point[] {
	const isP1Min = p1.x < p2.x || (p1.x === p2.x && p1.y < p2.y);
	const P_min = isP1Min ? p1 : p2;
	const P_max = isP1Min ? p2 : p1;

	const dx = P_max.x - P_min.x;
	const dy = P_max.y - P_min.y;
	const ady = Math.abs(dy);
	const minD = Math.min(dx, ady);

	const points = [P_min];
	if (minD > 0 && dx !== ady) {
		points.push({ x: P_min.x + minD, y: P_min.y + Math.sign(dy) * minD });
	}
	points.push(P_max);

	return isP1Min ? points : points.reverse();
}

export function getTunnelKey(u: Point, v: Point): string {
	const isUMin = u.x < v.x || (u.x === v.x && u.y < v.y);
	const min = isUMin ? u : v;
	const max = isUMin ? v : u;
	return `${Math.round(min.x)},${Math.round(min.y)};${Math.round(max.x)},${Math.round(max.y)}`;
}

export function intersectLines(A: Point, B: Point, C: Point, D: Point): Point | null {
	const a1 = B.y - A.y,
		b1 = A.x - B.x,
		c1 = a1 * A.x + b1 * A.y;
	const a2 = D.y - C.y,
		b2 = C.x - D.x,
		c2 = a2 * C.x + b2 * C.y;
	const det = a1 * b2 - a2 * b1;
	if (Math.abs(det) < 1e-4) return null;
	return { x: (b2 * c1 - b1 * c2) / det, y: (a1 * c2 - a2 * c1) / det };
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
	if (anchor === 'N' || anchor === 'NE' || anchor === 'NW') titleY = anchorY - 3;
	else if (anchor === 'S' || anchor === 'SE' || anchor === 'SW') titleY = anchorY + 9;
	else titleY = anchorY + 3;

	return { x: anchorX, y: titleY, subtitleY: titleY + 13 };
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

export function partitionLineIdsByVisibility(
	routePoints: import('$lib/types').RoutePoint[],
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
