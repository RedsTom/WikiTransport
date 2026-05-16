import { GRID_SIZE, LINE_SPACING } from '$lib/constants/schematic';
import type { Station, RoutePoint } from '$lib/types';

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
	if (anchor === 'N' || anchor === 'NE' || anchor === 'NW') titleY = anchorY - 3;
	else if (anchor === 'S' || anchor === 'SE' || anchor === 'SW') titleY = anchorY + 9;
	else titleY = anchorY + 3;

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

export interface Tunnel {
	u: Point;
	v: Point;
	lines: Set<number>;
}

export function buildTunnels(
	lines: { id?: number }[],
	routePoints: RoutePoint[],
	anchorPoints: { lineId: number; schematicX: number; schematicY: number; order: number }[],
	stationPosition: (stationId: number) => Point | null,
	hiddenLineIds: Set<number>
): { basePaths: Map<number, Point[]>; tunnels: Map<string, Tunnel>; stationPoints: Set<string> } {
	const basePaths = new Map<number, Point[]>();
	const tunnels = new Map<string, Tunnel>();
	const stationPoints = new Set<string>();

	for (const line of lines) {
		if (!line.id || hiddenLineIds.has(line.id)) continue;

		const rps = routePoints.filter((rp) => rp.lineId === line.id);
		const aps = anchorPoints.filter((ap) => ap.lineId === line.id);

		const pts: { pos: Point; order: number }[] = [];
		for (const rp of rps) {
			const pos = stationPosition(rp.stationId);
			if (pos) {
				pts.push({ pos, order: rp.order });
				stationPoints.add(`${Math.round(pos.x)},${Math.round(pos.y)}`);
			}
		}
		for (const ap of aps) {
			pts.push({ pos: { x: ap.schematicX, y: ap.schematicY }, order: ap.order });
		}

		pts.sort((a, b) => a.order - b.order);

		const basePath: Point[] = [];
		if (pts.length > 0) {
			basePath.push(pts[0].pos);
			for (let i = 1; i < pts.length; i++) {
				const prev = pts[i - 1].pos;
				const curr = pts[i].pos;
				const oct = routeOctilinear(prev, curr);
				for (let j = 1; j < oct.length; j++) basePath.push(oct[j]);
			}
		}

		const dedup: Point[] = [];
		for (const p of basePath) {
			if (
				dedup.length === 0 ||
				Math.hypot(dedup[dedup.length - 1].x - p.x, dedup[dedup.length - 1].y - p.y) > 0.1
			) {
				dedup.push(p);
			}
		}
		basePaths.set(line.id, dedup);

		for (let i = 0; i < dedup.length - 1; i++) {
			const u = dedup[i],
				v = dedup[i + 1];
			const key = getTunnelKey(u, v);
			if (!tunnels.has(key)) tunnels.set(key, { u, v, lines: new Set() });
			tunnels.get(key)!.lines.add(line.id);
		}
	}
	return { basePaths, tunnels, stationPoints };
}

export function computeLineOffsets(
	tunnels: Map<string, Tunnel>,
	lineMap: Map<number, { id?: number; transitTypeId?: number }>
): Map<string, Map<number, Point>> {
	const lineOffsetsInTunnel = new Map<string, Map<number, Point>>();

	for (const [key, tunnel] of tunnels) {
		const sortedLines = Array.from(tunnel.lines).sort((a, b) => {
			const ta = lineMap.get(a)?.transitTypeId ?? 0;
			const tb = lineMap.get(b)?.transitTypeId ?? 0;
			return ta - tb || a - b;
		});

		const isUMin =
			tunnel.u.x < tunnel.v.x || (tunnel.u.x === tunnel.v.x && tunnel.u.y < tunnel.v.y);
		const P_min = isUMin ? tunnel.u : tunnel.v;
		const P_max = isUMin ? tunnel.v : tunnel.u;

		const dx = P_max.x - P_min.x,
			dy = P_max.y - P_min.y;
		const len = Math.hypot(dx, dy);

		let nx = 0,
			ny = 0;
		if (len > 0.1) {
			nx = -dy / len;
			ny = dx / len;
		}

		const offsets = new Map<number, Point>();
		for (let i = 0; i < sortedLines.length; i++) {
			const lid = sortedLines[i];
			const d = (i - (sortedLines.length - 1) / 2) * LINE_SPACING;
			offsets.set(lid, { x: nx * d, y: ny * d });
		}
		lineOffsetsInTunnel.set(key, offsets);
	}
	return lineOffsetsInTunnel;
}

export function getOffsetPath(
	basePath: Point[],
	lineId: number,
	lineOffsets: Map<string, Map<number, Point>>,
	stationPoints: Set<string>
): Point[] {
	if (basePath.length < 2) return basePath;

	const offsetPath: Point[] = [];

	for (let i = 0; i < basePath.length; i++) {
		const isStation = stationPoints.has(
			`${Math.round(basePath[i].x)},${Math.round(basePath[i].y)}`
		);

		if (i === 0) {
			const k = getTunnelKey(basePath[0], basePath[1]);
			const O = lineOffsets.get(k)?.get(lineId) ?? { x: 0, y: 0 };
			offsetPath.push({ x: basePath[0].x + O.x, y: basePath[0].y + O.y });
		} else if (i === basePath.length - 1) {
			const k = getTunnelKey(basePath[i - 1], basePath[i]);
			const O = lineOffsets.get(k)?.get(lineId) ?? { x: 0, y: 0 };
			offsetPath.push({ x: basePath[i].x + O.x, y: basePath[i].y + O.y });
		} else {
			const k_prev = getTunnelKey(basePath[i - 1], basePath[i]);
			const O_prev = lineOffsets.get(k_prev)?.get(lineId) ?? { x: 0, y: 0 };

			const k_next = getTunnelKey(basePath[i], basePath[i + 1]);
			const O_next = lineOffsets.get(k_next)?.get(lineId) ?? { x: 0, y: 0 };

			const B_in = { x: basePath[i].x + O_prev.x, y: basePath[i].y + O_prev.y };
			const B_out = { x: basePath[i].x + O_next.x, y: basePath[i].y + O_next.y };

			if (isStation) {
				offsetPath.push(B_in);
				if (Math.hypot(B_in.x - B_out.x, B_in.y - B_out.y) > 0.1) {
					offsetPath.push(B_out);
				}
			} else {
				const A = { x: basePath[i - 1].x + O_prev.x, y: basePath[i - 1].y + O_prev.y };
				const C = B_out;
				const D = { x: basePath[i + 1].x + O_next.x, y: basePath[i + 1].y + O_next.y };

				const Q = intersectLines(A, B_in, C, D);
				if (Q) {
					offsetPath.push(Q);
				} else {
					offsetPath.push(B_in);
					if (Math.hypot(B_in.x - B_out.x, B_in.y - B_out.y) > 0.1) offsetPath.push(B_out);
				}
			}
		}
	}
	return offsetPath;
}

export function createPathFromPoints(coords: Point[]): string {
	if (coords.length === 0) return '';
	let path = `M ${coords[0].x} ${coords[0].y}`;
	for (let i = 1; i < coords.length; i++) path += ` L ${coords[i].x} ${coords[i].y}`;
	return path;
}
